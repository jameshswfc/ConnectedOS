import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { projectVisibilityWhere } from "@/modules/projects/project-permissions";
import { canReadSage, sageInvoiceCreationEnabled } from "@/services/integrations/sage/sage-security";
import { withSageSession } from "@/services/integrations/sage/sage-session";
import { fetchSageCustomers, invoicePostingCodes, postApprovedSageInvoice, validateInvoicePostingCodes, type SageInvoicePayload } from "@/services/integrations/sage/sage-invoice-writer";
import { sendTemplatedEmailToUserIds } from "@/services/email/email-service";
import { canRequestProjectInvoice, invoiceAmounts, invoiceApprovalSchema, invoiceRequestSchema, invoiceTriggerOptions } from "./invoice-request-rules";

export function isInvoiceApprover(context: CrmAccessContext) {
  return Boolean(process.env.PROJECT_INVOICE_APPROVER_USER_ID) && context.userId === process.env.PROJECT_INVOICE_APPROVER_USER_ID && context.permissionLevel === "administrator";
}
export async function getInvoiceApprovalCard(context: CrmAccessContext) {
  if (!isInvoiceApprover(context)) return null;
  const count = await prisma.projectInvoiceRequest.count({ where: { approverId: context.userId, status: "requested", project: { deletedAt: null } } });
  return { title: "Project Invoice Approvals", value: String(count), helper: "Completed work awaiting your invoice review", href: "/finance/invoice-requests" };
}
function assertApprover(context: CrmAccessContext) {
  if (!isInvoiceApprover(context)) throw new Error("Missing permission: designated invoice approver");
}
async function safeEmail(userId: string, title: string, summary: string, id: string) {
  try {
    await sendTemplatedEmailToUserIds([userId], () => ({ title, summary, actionLabel: "Review invoice request", actionHref: `${process.env.NEXTAUTH_URL || ""}/finance/invoice-requests/${id}` }));
  } catch { console.error("Invoice request email failed", { requestId: id, code: "INVOICE_EMAIL_FAILED" }); }
}
const projectInclude = { account: true, milestones: { where: { deletedAt: null } }, stageGates: true } satisfies Prisma.ProjectInclude;

export async function getInvoiceRequestProject(context: CrmAccessContext, projectId: string) {
  const project = await prisma.project.findFirst({ where: { AND: [{ id: projectId }, projectVisibilityWhere(context)] }, include: projectInclude });
  if (!project || !canRequestProjectInvoice(context, project)) throw new Error("Missing permission: request project invoice");
  return project;
}

export async function requestProjectInvoice(context: CrmAccessContext, raw: unknown) {
  const input = invoiceRequestSchema.parse(raw);
  const project = await getInvoiceRequestProject(context, input.projectId);
  const approver = await prisma.user.findFirst({ where: { id: process.env.PROJECT_INVOICE_APPROVER_USER_ID || "00000000-0000-0000-0000-000000000000", isActive: true, deactivatedAt: null, deletedAt: null, permissionLevel: "administrator" }, select: { id: true } });
  if (!approver) throw new Error("Unable to request an invoice: James must be configured as the active invoice approver first.");
  const amounts = invoiceAmounts(input.netAmount, input.taxRate);
  const result = await prisma.$transaction(async (tx) => {
    // Completion and billing reservations are rechecked in one serialisable transaction.
    const current = await tx.project.findUniqueOrThrow({ where: { id: project.id }, include: projectInclude });
    if (current.deletedAt || !canRequestProjectInvoice(context, current)) throw new Error("Missing permission: request project invoice");
    const trigger = invoiceTriggerOptions(current).find((option) => option.key === input.triggerKey);
    if (!trigger) throw new Error("Invalid billing stage. Complete the project, milestone or stage before requesting its invoice.");
    const existing = await tx.projectInvoiceRequest.findUnique({ where: { projectId_triggerKey: { projectId: project.id, triggerKey: input.triggerKey } } });
    if (existing && existing.status !== "rejected") return { record: existing, submitted: false };
    const reserved = await tx.projectInvoiceRequest.aggregate({ where: { projectId: project.id, status: { not: "rejected" } }, _sum: { netAmount: true } });
    if (amounts.netAmount.plus(reserved._sum.netAmount || 0).greaterThan(current.commercialValue)) throw new Error("Invalid amount: invoice requests exceed the project contract value. Please review existing requests and variations.");
    const values = { projectId: project.id, triggerKey: trigger.key, triggerLabel: trigger.label, description: input.description, ...amounts, requestedById: context.userId, approverId: approver.id };
    const record = existing
      ? await tx.projectInvoiceRequest.update({ where: { id: existing.id }, data: { ...values, status: "requested", rejectionReason: null } })
      : await tx.projectInvoiceRequest.create({ data: values });
    await tx.auditLog.create({ data: { userId: context.userId, module: "finance", entityType: "ProjectInvoiceRequest", entityId: record.id, action: "request_invoice", newValue: { projectId: project.id, trigger: trigger.key, netAmount: amounts.netAmount.toString(), approverId: approver.id } } });
    await tx.notification.create({ data: { userId: approver.id, title: "Project invoice approval requested", body: `${project.projectNumber}: ${trigger.label}. Review the amount and customer before creating the Sage invoice.`, metadata: { href: `/finance/invoice-requests/${record.id}`, projectId: project.id, type: "project_invoice_requested" } } });
    return { record, submitted: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (result.submitted) await safeEmail(approver.id, "Project invoice approval requested", `${project.projectNumber}: review the invoice request.`, result.record.id);
  return result.record;
}

export function invoiceRequestVisibility(context: CrmAccessContext): Prisma.ProjectInvoiceRequestWhereInput {
  if (canReadSage(context) || isInvoiceApprover(context)) return {};
  return { project: projectVisibilityWhere(context) };
}
export async function getInvoiceRequest(context: CrmAccessContext, id: string) {
  const record = await prisma.projectInvoiceRequest.findFirst({ where: { AND: [{ id }, invoiceRequestVisibility(context)] }, include: { project: { include: { account: true } }, requestedBy: { select: { displayName: true } }, approver: { select: { displayName: true } } } });
  if (!record) throw new Error("Missing permission: invoice request access");
  return record;
}
export async function getInvoiceCustomers(context: CrmAccessContext) {
  assertApprover(context);
  return withSageSession((tokens, businessId) => fetchSageCustomers(tokens.access_token, businessId));
}

export async function approveProjectInvoice(context: CrmAccessContext, id: string, raw: unknown) {
  assertApprover(context);
  const input = invoiceApprovalSchema.parse(raw);
  if (!sageInvoiceCreationEnabled()) throw new Error("Unable to approve for creation: Sage invoice creation is not enabled. The request remains pending for James.");
  const record = await getInvoiceRequest(context, id);
  if (record.status !== "requested") throw new Error("Invalid action: this request has already been reviewed. Do not submit it again.");
  if (record.approverId !== context.userId) throw new Error("Missing permission: this invoice request belongs to another approver");
  const codes = invoicePostingCodes(record.taxRate.toString());
  return withSageSession(async (tokens, businessId) => {
    if (tokens.scope !== "full_access") throw new Error("Unable to create an invoice until Sage write access has been authorised.");
    const customer = (await fetchSageCustomers(tokens.access_token, businessId)).find((c) => c.id === input.contactId);
    if (!customer) throw new Error("Invalid Sage customer. Reload the customer list and confirm the correct account.");
    await validateInvoicePostingCodes(tokens.access_token, businessId, codes, record.taxRate.toString(), input.date);
    const payload: SageInvoicePayload = { sales_invoice: { contact_id: customer.id, date: input.date, due_date: input.dueDate, reference: `COS-${record.id}`, notes: `${record.project.projectNumber} - ${record.triggerLabel}`, currency_id: "GBP", invoice_lines: [{ description: record.description, ledger_account_id: codes.ledger, quantity: 1, unit_price: record.netAmount.toNumber(), tax_rate_id: codes.tax, tax_amount: record.taxAmount.toNumber() }] } };
    await prisma.$transaction(async (tx) => {
      const current = await tx.project.findUniqueOrThrow({ where: { id: record.projectId }, include: projectInclude });
      if (current.deletedAt || !invoiceTriggerOptions(current).some((t) => t.key === record.triggerKey)) throw new Error("Invalid billing stage: the completed work has changed. Review the project before approval.");
      const reserved = await tx.projectInvoiceRequest.aggregate({ where: { projectId: record.projectId, status: { not: "rejected" } }, _sum: { netAmount: true } });
      if (new Prisma.Decimal(reserved._sum.netAmount || record.netAmount).greaterThan(current.commercialValue)) throw new Error("Invalid amount: invoice requests now exceed the project contract value. Review variations and existing requests before approval.");
      const saved = await tx.projectInvoiceRequest.updateMany({ where: { id, status: "requested", approverId: context.userId }, data: { status: "creating", approvedAt: new Date(), sageBusinessId: businessId, sageContactId: customer.id, sageContactName: customer.name, approvedPayload: payload as unknown as Prisma.InputJsonValue } });
      if (saved.count !== 1) throw new Error("Invalid action: this invoice request is already being processed.");
      await tx.auditLog.create({ data: { userId: context.userId, module: "finance", entityType: "ProjectInvoiceRequest", entityId: id, action: "approve_invoice", newValue: { businessId, customerId: customer.id, total: record.totalAmount.toString(), reference: payload.sales_invoice.reference } } });
    });
    try {
      const result = await postApprovedSageInvoice(tokens, businessId, payload);
      await prisma.$transaction(async (tx) => {
        await tx.projectInvoiceRequest.update({ where: { id }, data: { status: "created", sageInvoiceId: result.id, sageInvoiceNumber: result.invoice_number, lastError: null } });
        await tx.auditLog.create({ data: { userId: context.userId, module: "finance", entityType: "ProjectInvoiceRequest", entityId: id, action: "sage_invoice_created", newValue: { sageInvoiceId: result.id, invoiceNumber: result.invoice_number } } });
        await tx.notification.create({ data: { userId: record.requestedById, title: "Sage invoice created", body: `${record.project.projectNumber}: ${result.invoice_number}`, metadata: { href: `/finance/invoice-requests/${id}`, type: "project_invoice_created" } } });
      });
      await safeEmail(record.requestedById, "Sage invoice created", `${record.project.projectNumber}: ${result.invoice_number}`, id);
      return { status: "created", invoiceNumber: result.invoice_number };
    } catch {
      console.error("Sage invoice requires reconciliation", { projectId: record.projectId, requestId: id, userId: context.userId, code: "SAGE_CREATE_UNCONFIRMED" });
      await prisma.$transaction(async (tx) => {
        await tx.projectInvoiceRequest.update({ where: { id }, data: { status: "reconciliation_required", lastError: "Creation could not be confirmed. Check Sage for this request reference before any further action. Automatic retries are blocked." } });
        await tx.auditLog.create({ data: { userId: context.userId, module: "finance", entityType: "ProjectInvoiceRequest", entityId: id, action: "invoice_reconciliation_required", newValue: { reference: payload.sales_invoice.reference } } });
        await tx.notification.create({ data: { userId: context.userId, title: "Invoice needs reconciliation", body: `Check Sage for ${payload.sales_invoice.reference}. Do not create a duplicate.`, metadata: { href: `/finance/invoice-requests/${id}`, type: "project_invoice_reconciliation" } } });
      });
      return { status: "reconciliation_required" };
    }
  });
}

export async function rejectProjectInvoice(context: CrmAccessContext, id: string, reason: string) {
  assertApprover(context);
  if (typeof reason !== "string" || reason.trim().length < 5 || reason.length > 1000) throw new Error("Invalid rejection reason. Please explain what needs correcting.");
  const record = await getInvoiceRequest(context, id);
  await prisma.$transaction(async (tx) => {
    const saved = await tx.projectInvoiceRequest.updateMany({ where: { id, status: "requested", approverId: context.userId }, data: { status: "rejected", rejectionReason: reason.trim() } });
    if (saved.count !== 1) throw new Error("Invalid action: this request has already been reviewed.");
    await tx.auditLog.create({ data: { userId: context.userId, module: "finance", entityType: "ProjectInvoiceRequest", entityId: id, action: "reject_invoice", newValue: { reason: reason.trim() } } });
    await tx.notification.create({ data: { userId: record.requestedById, title: "Invoice request rejected", body: reason.trim(), metadata: { href: `/finance/invoice-requests/${id}`, type: "project_invoice_rejected" } } });
  });
  await safeEmail(record.requestedById, "Invoice request rejected", reason.trim(), id);
  return { status: "rejected" };
}
