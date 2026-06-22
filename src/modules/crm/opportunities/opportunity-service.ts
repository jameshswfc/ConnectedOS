import { OpportunityStage, OpportunityStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { activityVisibilityWhere, assertCanEditOwnedCrmRecord, assertCrmPermission, opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import { calculateStageFinancials } from "@/modules/crm/opportunities/opportunity-calculations";
import { calculateOpportunityHealth, matchesHealthFilter, type OpportunityHealthStatus } from "@/modules/crm/opportunities/opportunity-health";
import { defaultOpportunityStage, isOpportunityStage } from "@/modules/crm/opportunities/opportunity-stages";
import { ProjectCreationService } from "@/modules/projects/project-service";
import { resolveSalesRecordOwnerIdFromDb, salespersonOpportunityWhere } from "@/modules/crm/sales/salesperson-service";
import { createPresalesRequestFromOpportunityStage, shouldAutoCreatePresalesForCreatedStage, shouldAutoCreatePresalesForStageChange } from "@/modules/presales/presales-service";
import { presalesVisibilityWhere } from "@/modules/presales/presales-permissions";
import type { OpportunityCreateInput, OpportunityStageChangeInput, OpportunityUpdateInput } from "@/modules/crm/schemas/crm-schemas";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export type OpportunityListFilters = {
  search?: string;
  salespersonId?: string | null;
  health?: OpportunityHealthStatus[];
};

export async function listOpportunities(context: CrmAccessContext, filters: string | OpportunityListFilters = {}) {
  const normalizedFilters = typeof filters === "string" ? { search: filters } : filters;
  const opportunities = await prisma.opportunity.findMany({
    where: {
      AND: [
        opportunityVisibilityWhere(context),
        salespersonOpportunityWhere(context, normalizedFilters.salespersonId),
        normalizedFilters.search
          ? {
              OR: [
                { opportunityName: { contains: normalizedFilters.search, mode: "insensitive" } },
                { account: { name: { contains: normalizedFilters.search, mode: "insensitive" } } }
              ]
            }
          : {}
      ]
    },
    include: {
      account: true,
      primaryContact: true,
      owner: true,
      salesActivities: { where: activityVisibilityWhere(context), orderBy: { createdAt: "desc" }, take: 5 },
      presalesRequests: { where: presalesVisibilityWhere(context), orderBy: { internalDeadline: "asc" } }
    },
    orderBy: { updatedAt: "desc" }
  });
  return opportunities
    .map((opportunity) => ({ ...opportunity, healthStatus: calculateOpportunityHealth(opportunity) }))
    .filter((opportunity) => matchesHealthFilter(opportunity.healthStatus, normalizedFilters.health));
}

export async function getOpportunity(context: CrmAccessContext, id: string) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { AND: [opportunityVisibilityWhere(context), { id }] },
    include: {
      account: true,
      primaryContact: true,
      owner: true,
      salesActivities: { where: activityVisibilityWhere(context), include: { account: true, contact: true, lead: true }, orderBy: { createdAt: "desc" } },
      quotes: {
        where: { deletedAt: null },
        include: {
          versions: { orderBy: { versionNumber: "desc" }, take: 1 },
          approvalRequests: { orderBy: { requestedAt: "desc" }, take: 1 }
        },
        orderBy: { updatedAt: "desc" }
      },
      presalesRequests: { where: presalesVisibilityWhere(context), include: { assignedTo: true, quote: true }, orderBy: { updatedAt: "desc" } },
      stageHistory: { orderBy: { changedAt: "desc" } }
    }
  });
  if (!opportunity) {
    throw new Error("Opportunity not found");
  }
  return { ...opportunity, healthStatus: calculateOpportunityHealth(opportunity) };
}

export async function createOpportunity(context: CrmAccessContext, input: OpportunityCreateInput) {
  assertCrmPermission(context, "crm.opportunity.create");
  const value = input.value ?? 0;
  const stage = input.stage ?? defaultOpportunityStage;
  const { probabilityPercent, weightedValue } = calculateStageFinancials(stage, value);
  const ownerId = await resolveSalesRecordOwnerIdFromDb(context, input.ownerId);
  const opportunity = await prisma.opportunity.create({
    data: {
      ...input,
      stage,
      ownerId,
      value,
      probabilityPercent,
      weightedValue,
      createdById: context.userId,
      updatedById: context.userId
    }
  });
  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Opportunity", entityId: opportunity.id, action: "create", newValue: opportunity });
  if (shouldAutoCreatePresalesForCreatedStage(stage)) {
    await createPresalesRequestFromOpportunityStage(context, opportunity.id);
  }
  return opportunity;
}

export async function updateOpportunity(context: CrmAccessContext, id: string, input: OpportunityUpdateInput) {
  assertCrmPermission(context, "crm.opportunity.update");
  const previous = await getOpportunity(context, id);
  assertCanEditOwnedCrmRecord(context, previous.ownerId);
  const { ownerId: requestedOwnerId, ...opportunityInput } = input;
  const nextOwnerId = requestedOwnerId ? await resolveSalesRecordOwnerIdFromDb(context, requestedOwnerId) : undefined;
  const nextValue = opportunityInput.value ?? Number(previous.value);
  const nextStage = opportunityInput.stage ?? previous.stage;
  const nextFinancials = calculateStageFinancials(nextStage, nextValue);
  const opportunity = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.opportunity.update({
      where: { id },
      data: {
        ...opportunityInput,
        ...(nextOwnerId ? { ownerId: nextOwnerId } : {}),
        stage: nextStage,
        ...(nextStage === OpportunityStage.closed_won_po_received ? { status: OpportunityStatus.won, wonDate: new Date() } : {}),
        probabilityPercent: nextFinancials.probabilityPercent,
        weightedValue: nextFinancials.weightedValue,
        updatedById: context.userId
      }
    });

    if (previous.stage !== nextStage) {
      await transaction.opportunityStageHistory.create({
        data: {
          opportunityId: id,
          fromStage: previous.stage,
          toStage: nextStage,
          changedById: context.userId
        }
      });
    }

    return updated;
  });
  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Opportunity", entityId: opportunity.id, action: "update", previousValue: previous, newValue: opportunity });
  if (shouldAutoCreatePresalesForStageChange(previous.stage, nextStage)) {
    await createPresalesRequestFromOpportunityStage(context, opportunity.id);
  }
  if (previous.stage !== nextStage && nextStage === OpportunityStage.closed_won_po_received) {
    await ProjectCreationService.syncClosedWonOpportunity(context, opportunity.id);
  }
  return opportunity;
}

export async function changeOpportunityStage(context: CrmAccessContext, id: string, input: OpportunityStageChangeInput) {
  assertCrmPermission(context, "crm.opportunity.update");
  if (!isOpportunityStage(input.stage)) {
    throw new Error("Invalid opportunity stage");
  }

  const previous = await getOpportunity(context, id);
  assertCanEditOwnedCrmRecord(context, previous.ownerId);
  const { probabilityPercent, weightedValue } = calculateStageFinancials(input.stage, Number(previous.value));

  const opportunity = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.opportunity.update({
      where: { id },
      data: {
        stage: input.stage,
        ...(input.stage === OpportunityStage.closed_won_po_received ? { status: OpportunityStatus.won, wonDate: new Date() } : {}),
        probabilityPercent,
        weightedValue,
        updatedById: context.userId
      }
    });

    if (previous.stage !== input.stage) {
      await transaction.opportunityStageHistory.create({
        data: {
          opportunityId: id,
          fromStage: previous.stage,
          toStage: input.stage,
          changedById: context.userId
        }
      });
    }

    return updated;
  });

  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Opportunity", entityId: opportunity.id, action: "change_stage", previousValue: previous, newValue: opportunity });
  if (shouldAutoCreatePresalesForStageChange(previous.stage, input.stage)) {
    await createPresalesRequestFromOpportunityStage(context, opportunity.id);
  }
  if (previous.stage !== input.stage && input.stage === OpportunityStage.closed_won_po_received) {
    await ProjectCreationService.syncClosedWonOpportunity(context, opportunity.id);
  }
  return opportunity;
}

export async function softDeleteOpportunity(context: CrmAccessContext, id: string) {
  assertCrmPermission(context, "crm.opportunity.delete");
  const previous = await getOpportunity(context, id);
  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: context.userId, updatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "crm", entityType: "Opportunity", entityId: opportunity.id, action: "soft_delete", previousValue: previous, newValue: opportunity });
  return opportunity;
}
