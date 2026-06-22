import { OpportunityStage, OpportunityStatus, QuoteApprovalRuleType, QuoteApprovalStatus, QuoteStatus } from "@prisma/client";
import type { Prisma, QuoteApprovalRule, QuoteStatus as QuoteStatusValue } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { sendTemplatedEmail, sendTemplatedEmailToUserIds } from "@/services/email/email-service";
import { createNotification } from "@/services/notifications/notification-service";
import { calculateStageFinancials } from "@/modules/crm/opportunities/opportunity-calculations";
import { CLOSED_OPPORTUNITY_STAGES, getStageProbability } from "@/modules/crm/opportunities/opportunity-stages";
import { assertQuotePermission } from "@/modules/quoting/quotes/quote-permissions";
import { getQuote, getQuoteVersion } from "@/modules/quoting/quotes/quote-service";
import { assertValidQuoteStatusTransition, statusTimestampField } from "@/modules/quoting/quotes/quote-status-workflow";
import { ProjectCreationService, shouldAutoCreateProjectForQuoteStatus, syncProjectChangeRequestFromQuote } from "@/modules/projects/project-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export const LOW_MARGIN_APPROVAL_THRESHOLD = 25;
export const HIGH_VALUE_APPROVAL_THRESHOLD = 50_000;

type ApprovalLine = {
  unitSell: unknown;
  product?: { defaultSellPrice: unknown } | null;
};

export type QuoteApprovalEvaluationInput = {
  sellTotal: unknown;
  marginPercent: unknown;
  lines: ApprovalLine[];
};

export type TriggeredApprovalRule = {
  ruleType: QuoteApprovalRuleType;
  label: string;
  thresholdValue: number | null;
};

type QuoteOpportunityStatusSyncInput = {
  status: QuoteStatusValue;
  currentStage: OpportunityStage;
  currentValue: number;
  sellTotal: number;
};

export type QuoteOpportunityStatusSync = {
  nextStage: OpportunityStage;
  probabilityPercent: number;
  weightedValue: number;
  value?: number;
  status?: OpportunityStatus;
  wonDate?: Date;
};

const ruleLabels: Record<QuoteApprovalRuleType, string> = {
  [QuoteApprovalRuleType.low_margin]: "Margin below 25%",
  [QuoteApprovalRuleType.high_value]: "Quote value above GBP 50,000",
  [QuoteApprovalRuleType.manual_override]: "Line sell price below catalogue default"
};

export async function getApprovalStatus(context: CrmAccessContext, quoteId: string) {
  const quote = await getQuote(context, quoteId);
  const currentVersion = quote.versions.find((version) => version.versionNumber === quote.currentVersionNumber) ?? quote.versions[0];
  const triggeredRules = currentVersion ? await evaluateQuoteVersionApprovalRules(currentVersion.id) : [];
  const requests = await prisma.quoteApprovalRequest.findMany({
    where: { quoteId },
    include: { requestedBy: true, approver: true },
    orderBy: { requestedAt: "desc" }
  });
  return { quote, currentVersion, triggeredRules, requests };
}

export async function submitQuoteForApproval(context: CrmAccessContext, quoteId: string) {
  assertQuotePermission(context, "quotes.update");
  const quote = await getQuote(context, quoteId);
  const currentVersion = quote.versions.find((version) => version.versionNumber === quote.currentVersionNumber) ?? quote.versions[0];
  if (!currentVersion) throw new Error("Quote has no version to submit");
  if (currentVersion.isLocked) throw new Error("Approved quote version is locked");

  const triggeredRules = await evaluateQuoteVersionApprovalRules(currentVersion.id);
  assertValidQuoteStatusTransition(quote.status, QuoteStatus.internal_review);
  const reason = triggeredRules.length > 0 ? triggeredRules.map((rule) => rule.label).join("; ") : "Approval requested";
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.quoteVersion.update({
      where: { id: currentVersion.id },
      data: { status: QuoteStatus.internal_review, updatedById: context.userId }
    });
    const updatedQuote = await transaction.quote.update({
      where: { id: quoteId },
      data: {
        status: QuoteStatus.internal_review,
        submittedForApprovalAt: new Date(),
        updatedById: context.userId
      }
    });
    const approvalRequest = await transaction.quoteApprovalRequest.create({
      data: {
        quoteId,
        quoteVersionId: currentVersion.id,
        requestedById: context.userId,
        status: QuoteApprovalStatus.pending,
        reason
      }
    });
    return { quote: updatedQuote, approvalRequest };
  });

  await notifyApprovers(quoteId, reason);
  if (quote.owner.email) {
    await sendTemplatedEmail({
      to: quote.owner.email,
      title: "Quote submitted for approval",
      summary: `${quote.quoteNumber} has been submitted for approval.`,
      details: [
        { label: "Quote", value: quote.quoteNumber },
        { label: "Account", value: quote.account.name },
        { label: "Opportunity", value: quote.opportunity?.opportunityName ?? "-" },
        { label: "Reason", value: reason }
      ],
      actionLabel: "Open quote",
      actionHref: `/quotes/${quote.id}`
    });
  }
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "QuoteApprovalRequest", entityId: result.approvalRequest.id, action: "submit_for_approval", newValue: result.approvalRequest });
  return { ...result, triggeredRules };
}

export async function approveQuote(context: CrmAccessContext, quoteId: string) {
  assertQuotePermission(context, "quotes.approve");
  const quote = await getQuote(context, quoteId);
  assertValidQuoteStatusTransition(quote.status, QuoteStatus.approved);

  const pendingRequest = await prisma.quoteApprovalRequest.findFirst({
    where: { quoteId, status: QuoteApprovalStatus.pending },
    orderBy: { requestedAt: "desc" }
  });
  if (!pendingRequest && quote.status === QuoteStatus.internal_review) {
    throw new Error("Pending approval request not found");
  }
  assertCanApproveQuote(context, quote.ownerId, pendingRequest?.requestedById);

  const result = await prisma.$transaction(async (transaction) => {
    if (pendingRequest) {
      await transaction.quoteApprovalRequest.update({
        where: { id: pendingRequest.id },
        data: { status: QuoteApprovalStatus.approved, approverId: context.userId, decidedAt: new Date() }
      });
    }
    await transaction.quoteVersion.updateMany({
      where: { quoteId, versionNumber: quote.currentVersionNumber },
      data: { status: QuoteStatus.approved, isLocked: true, updatedById: context.userId }
    });
    return transaction.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.approved, approvedById: context.userId, approvedAt: new Date(), updatedById: context.userId }
    });
  });
  if (quote.projectChangeRequestId) {
    await syncProjectChangeRequestFromQuote(quoteId);
  }
  if (quote.owner.email) {
    await sendTemplatedEmail({
      to: quote.owner.email,
      title: "Quote approved",
      summary: `${quote.quoteNumber} has been approved.`,
      details: [
        { label: "Quote", value: quote.quoteNumber },
        { label: "Account", value: quote.account.name },
        { label: "Status", value: "Approved" }
      ],
      actionLabel: "Open quote",
      actionHref: `/quotes/${quote.id}`
    });
  }
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Quote", entityId: quoteId, action: "approve", previousValue: { status: quote.status }, newValue: result });
  return result;
}

export async function rejectQuote(context: CrmAccessContext, quoteId: string, comments: string) {
  assertQuotePermission(context, "quotes.approve");
  if (!comments.trim()) throw new Error("Rejection reason is required");
  const quote = await getQuote(context, quoteId);
  assertValidQuoteStatusTransition(quote.status, QuoteStatus.rejected);
  const pendingRequest = await prisma.quoteApprovalRequest.findFirst({
    where: { quoteId, status: QuoteApprovalStatus.pending },
    orderBy: { requestedAt: "desc" }
  });
  if (!pendingRequest) throw new Error("Pending approval request not found");
  assertCanApproveQuote(context, quote.ownerId, pendingRequest.requestedById);

  const result = await prisma.$transaction(async (transaction) => {
    await transaction.quoteApprovalRequest.update({
      where: { id: pendingRequest.id },
      data: { status: QuoteApprovalStatus.rejected, approverId: context.userId, comments, decidedAt: new Date() }
    });
    await transaction.quoteVersion.updateMany({
      where: { quoteId, versionNumber: quote.currentVersionNumber },
      data: { status: QuoteStatus.rejected, updatedById: context.userId }
    });
    return transaction.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.rejected, rejectedById: context.userId, rejectedAt: new Date(), updatedById: context.userId }
    });
  });
  if (quote.projectChangeRequestId) {
    await syncProjectChangeRequestFromQuote(quoteId);
  }
  if (quote.owner.email) {
    await sendTemplatedEmail({
      to: quote.owner.email,
      title: "Quote rejected",
      summary: `${quote.quoteNumber} was rejected during approval.`,
      details: [
        { label: "Quote", value: quote.quoteNumber },
        { label: "Account", value: quote.account.name },
        { label: "Reason", value: comments }
      ],
      actionLabel: "Open quote",
      actionHref: `/quotes/${quote.id}`
    });
  }
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Quote", entityId: quoteId, action: "reject", previousValue: { status: quote.status }, newValue: { ...result, comments } });
  return result;
}

export async function requestQuoteChanges(context: CrmAccessContext, quoteId: string, comments: string) {
  assertQuotePermission(context, "quotes.approve");
  if (!comments.trim()) throw new Error("Change request reason is required");
  const quote = await getQuote(context, quoteId);
  assertValidQuoteStatusTransition(quote.status, QuoteStatus.rejected);
  const pendingRequest = await prisma.quoteApprovalRequest.findFirst({
    where: { quoteId, status: QuoteApprovalStatus.pending },
    orderBy: { requestedAt: "desc" }
  });
  if (!pendingRequest) throw new Error("Pending approval request not found");
  assertCanApproveQuote(context, quote.ownerId, pendingRequest.requestedById);

  const result = await prisma.$transaction(async (transaction) => {
    await transaction.quoteApprovalRequest.update({
      where: { id: pendingRequest.id },
      data: { status: QuoteApprovalStatus.rejected, approverId: context.userId, comments: `Changes requested: ${comments}`, decidedAt: new Date() }
    });
    await transaction.quoteVersion.updateMany({
      where: { quoteId, versionNumber: quote.currentVersionNumber },
      data: { status: QuoteStatus.rejected, updatedById: context.userId }
    });
    return transaction.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.rejected, rejectedById: context.userId, rejectedAt: new Date(), updatedById: context.userId }
    });
  });
  if (quote.projectChangeRequestId) {
    await syncProjectChangeRequestFromQuote(quoteId);
  }
  if (quote.owner.email) {
    await sendTemplatedEmail({
      to: quote.owner.email,
      title: "Quote changes requested",
      summary: `${quote.quoteNumber} needs updates before it can move forward.`,
      details: [
        { label: "Quote", value: quote.quoteNumber },
        { label: "Account", value: quote.account.name },
        { label: "Comments", value: comments }
      ],
      actionLabel: "Open quote",
      actionHref: `/quotes/${quote.id}`
    });
  }
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Quote", entityId: quoteId, action: "request_changes", previousValue: { status: quote.status }, newValue: { ...result, comments } });
  return result;
}

export async function changeQuoteStatus(context: CrmAccessContext, quoteId: string, status: QuoteStatusValue) {
  assertQuotePermission(context, "quotes.update");
  const quote = await getQuote(context, quoteId);
  assertValidQuoteStatusTransition(quote.status, status);
  const timestampField = statusTimestampField(status);
  const result = await prisma.$transaction(async (transaction) => {
    const previousOpportunity = quote.opportunityId
      ? await transaction.opportunity.findUnique({ where: { id: quote.opportunityId } })
      : null;
    const data: Prisma.QuoteUpdateInput = { status, updatedById: context.userId };
    if (timestampField) data[timestampField] = new Date();
    if (status === QuoteStatus.accepted) {
      data.acceptedAt = new Date();
    }
    const updated = await transaction.quote.update({ where: { id: quoteId }, data });
    let opportunityStageChange:
      | {
          opportunityId: string;
          fromStage: OpportunityStage;
          toStage: OpportunityStage;
          probabilityPercent: number;
          weightedValue: number;
        }
      | null = null;

    if (quote.opportunityId && !quote.projectChangeRequestId && previousOpportunity) {
      const stageSync = getLinkedOpportunityStatusSync({
        status,
        currentStage: previousOpportunity.stage,
        currentValue: Number(previousOpportunity.value),
        sellTotal: Number(quote.sellTotal)
      });
      if (stageSync && (status === QuoteStatus.accepted || stageSync.nextStage !== previousOpportunity.stage)) {
        await transaction.opportunity.update({
          where: { id: quote.opportunityId },
          data: {
            stage: stageSync.nextStage,
            ...(stageSync.status ? { status: stageSync.status } : {}),
            ...(stageSync.value !== undefined ? { value: stageSync.value } : {}),
            ...(stageSync.wonDate ? { wonDate: stageSync.wonDate } : {}),
            probabilityPercent: stageSync.probabilityPercent,
            weightedValue: stageSync.weightedValue,
            updatedById: context.userId
          }
        });
        if (stageSync.nextStage !== previousOpportunity.stage) {
          await transaction.opportunityStageHistory.create({
            data: {
              opportunityId: quote.opportunityId,
              fromStage: previousOpportunity.stage,
              toStage: stageSync.nextStage,
              changedById: context.userId
            }
          });
          opportunityStageChange = {
            opportunityId: quote.opportunityId,
            fromStage: previousOpportunity.stage,
            toStage: stageSync.nextStage,
            probabilityPercent: stageSync.probabilityPercent,
            weightedValue: stageSync.weightedValue
          };
        }
      }
    }
    if (status === QuoteStatus.accepted && quote.opportunityId && !quote.projectChangeRequestId) {
      const probabilityPercent = getStageProbability(OpportunityStage.closed_won_po_received);
      await transaction.salesActivity.create({
        data: {
          accountId: quote.accountId,
          opportunityId: quote.opportunityId,
          ownerId: context.userId,
          activityType: "note",
          subject: `Quote ${quote.quoteNumber} accepted`,
          description: `Quote ${quote.quoteNumber} accepted. Link: /quotes/${quote.id}`,
          completedAt: new Date(),
          outcome: `Quote accepted: /quotes/${quote.id}`,
          createdById: context.userId,
          updatedById: context.userId
        }
      });
      if (previousOpportunity && previousOpportunity.stage !== OpportunityStage.closed_won_po_received) {
        opportunityStageChange = {
          opportunityId: quote.opportunityId,
          fromStage: previousOpportunity.stage,
          toStage: OpportunityStage.closed_won_po_received,
          probabilityPercent,
          weightedValue: Number(quote.sellTotal)
        };
      }
    }
    return { updatedQuote: updated, opportunityStageChange };
  });
  const { updatedQuote, opportunityStageChange } = result;

  if (quote.projectChangeRequestId) {
    await syncProjectChangeRequestFromQuote(quoteId);
  }
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Quote", entityId: quoteId, action: status === QuoteStatus.accepted ? "accepted" : "change_status", previousValue: { status: quote.status }, newValue: updatedQuote });
  if (opportunityStageChange) {
    await createAuditLog({
      userId: context.userId,
      module: "crm",
      entityType: "Opportunity",
      entityId: opportunityStageChange.opportunityId,
      action: "change_stage",
      previousValue: { stage: opportunityStageChange.fromStage },
      newValue: {
        stage: opportunityStageChange.toStage,
        probabilityPercent: opportunityStageChange.probabilityPercent,
        weightedValue: opportunityStageChange.weightedValue
      }
    });
  }
  if (!quote.projectChangeRequestId && shouldAutoCreateProjectForQuoteStatus(status)) {
    await ProjectCreationService.createFromAcceptedQuote(context, quoteId);
  }
  if (quote.owner.email && (status === QuoteStatus.sent || status === QuoteStatus.accepted)) {
    await sendTemplatedEmail({
      to: quote.owner.email,
      title: status === QuoteStatus.sent ? "Quote marked sent" : "Quote accepted",
      summary: status === QuoteStatus.sent
        ? `${quote.quoteNumber} has been marked as sent to the customer.`
        : `${quote.quoteNumber} has been accepted.`,
      details: [
        { label: "Quote", value: quote.quoteNumber },
        { label: "Account", value: quote.account.name },
        { label: "Opportunity", value: quote.opportunity?.opportunityName ?? "-" },
        { label: "Status", value: status.replaceAll("_", " ") }
      ],
      actionLabel: "Open quote",
      actionHref: `/quotes/${quote.id}`
    });
  }
  return updatedQuote;
}

async function notifyApprovers(quoteId: string, reason: string) {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { account: true, opportunity: true }
  });
  const approvers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: {
        rolePermissions: {
          some: {
            permission: { code: "quotes.approve" }
          }
        }
      }
    }
  });
  const link = `/quotes/${quote.id}`;
  await Promise.all(approvers.map((approver) => createNotification({
    userId: approver.id,
    title: `Quote ${quote.quoteNumber} pending approval`,
    body: `${quote.quoteNumber} for ${quote.account.name} / ${quote.opportunity?.opportunityName ?? "Opportunity"} is pending approval.`,
    metadata: { quoteId: quote.id, link, status: "pending_approval" }
  })));
  await sendTemplatedEmailToUserIds(approvers.map((approver) => approver.id), () => ({
    title: `Quote approval required: ${quote.quoteNumber}`,
    summary: `${quote.quoteNumber} is waiting for approval.`,
    details: [
      { label: "Quote", value: quote.quoteNumber },
      { label: "Account", value: quote.account.name },
      { label: "Opportunity", value: quote.opportunity?.opportunityName ?? "-" },
      { label: "Quote value", value: Number(quote.sellTotal).toFixed(2) },
      { label: "Margin %", value: Number(quote.marginPercent).toFixed(2) },
      { label: "Reason", value: reason }
    ],
    actionLabel: "Open quote",
    actionHref: link
  }));
}

export async function evaluateQuoteVersionApprovalRules(versionId: string) {
  const version = await prisma.quoteVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: { lines: { where: { deletedAt: null }, include: { product: true } } }
  });
  const rules = await prisma.quoteApprovalRule.findMany({ where: { isActive: true } });
  return evaluateQuoteApprovalTriggers({
    sellTotal: version.sellTotal,
    marginPercent: version.marginPercent,
    lines: version.lines
  }, rules);
}

export function evaluateQuoteApprovalTriggers(input: QuoteApprovalEvaluationInput, rules: Pick<QuoteApprovalRule, "ruleType" | "thresholdValue" | "isActive">[]): TriggeredApprovalRule[] {
  const activeRules = rules.filter((rule) => rule.isActive);
  const triggered: TriggeredApprovalRule[] = [];
  for (const rule of activeRules) {
    const thresholdValue = rule.thresholdValue === null ? null : Number(rule.thresholdValue);
    if (rule.ruleType === QuoteApprovalRuleType.low_margin && Number(input.sellTotal) > 0 && Number(input.marginPercent) < (thresholdValue ?? LOW_MARGIN_APPROVAL_THRESHOLD)) {
      triggered.push({ ruleType: rule.ruleType, label: ruleLabels[rule.ruleType], thresholdValue });
    }
    if (rule.ruleType === QuoteApprovalRuleType.high_value && Number(input.sellTotal) > (thresholdValue ?? HIGH_VALUE_APPROVAL_THRESHOLD)) {
      triggered.push({ ruleType: rule.ruleType, label: ruleLabels[rule.ruleType], thresholdValue });
    }
    if (rule.ruleType === QuoteApprovalRuleType.manual_override && hasBelowCatalogueOverride(input.lines)) {
      triggered.push({ ruleType: rule.ruleType, label: ruleLabels[rule.ruleType], thresholdValue });
    }
  }
  return triggered;
}

function hasBelowCatalogueOverride(lines: ApprovalLine[]) {
  return lines.some((line) => {
    if (!line.product) return false;
    return Number(line.unitSell) < Number(line.product.defaultSellPrice);
  });
}

export function canApproveQuoteRequest(context: CrmAccessContext, quoteOwnerId: string, requestedById?: string | null) {
  const isOwnQuote = context.userId === quoteOwnerId || context.userId === requestedById;
  if (!isOwnQuote) return true;
  return context.permissions.includes("quotes.approve_own") || context.permissions.includes("admin.users");
}

export function getLinkedOpportunityStatusSync(input: QuoteOpportunityStatusSyncInput): QuoteOpportunityStatusSync | null {
  if (input.status === QuoteStatus.sent) {
    if (CLOSED_OPPORTUNITY_STAGES.includes(input.currentStage) || input.currentStage === OpportunityStage.proposal_sent) {
      return null;
    }
    const financials = calculateStageFinancials(OpportunityStage.proposal_sent, input.currentValue);
    return {
      nextStage: OpportunityStage.proposal_sent,
      probabilityPercent: financials.probabilityPercent,
      weightedValue: financials.weightedValue
    };
  }

  if (input.status === QuoteStatus.accepted) {
    const probabilityPercent = getStageProbability(OpportunityStage.closed_won_po_received);
    return {
      nextStage: OpportunityStage.closed_won_po_received,
      status: OpportunityStatus.won,
      value: input.sellTotal,
      probabilityPercent,
      weightedValue: input.sellTotal,
      wonDate: new Date()
    };
  }

  return null;
}

function assertCanApproveQuote(context: CrmAccessContext, quoteOwnerId: string, requestedById?: string | null) {
  if (!canApproveQuoteRequest(context, quoteOwnerId, requestedById)) {
    throw new Error("Cannot approve your own quote without quotes.approve_own");
  }
}

export async function assertQuoteVersionExportable(context: CrmAccessContext, quoteId: string, versionId: string) {
  const version = await getQuoteVersion(context, versionId);
  if (version.quoteId !== quoteId) throw new Error("Quote version does not belong to quote");
  return version;
}
