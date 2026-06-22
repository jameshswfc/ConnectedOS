import { BillingScheduleStatus, BillingScheduleTrigger, CustomerInvoiceStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { assertAnyModulePermission, assertModulePermission, isAdminContext } from "@/modules/operations/module-permissions";
import { createAuditLog } from "@/services/audit/audit-service";

const invoiceInclude = {
  account: true,
  project: true,
  quote: true,
  createdBy: true,
  payments: true,
  billingSchedules: true
} satisfies Prisma.CustomerInvoiceInclude;

const billingInclude = {
  project: true,
  linkedInvoice: true
} satisfies Prisma.BillingScheduleInclude;

export async function listCustomerInvoices(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["finance.read_all", "finance.create_invoice", "finance.record_payment"]);
  return prisma.customerInvoice.findMany({
    where: financeVisibilityWhere(context),
    include: invoiceInclude,
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }]
  });
}

export async function createCustomerInvoice(context: CrmAccessContext, input: { accountId: string; projectId?: string | null; quoteId?: string | null; issueDate?: Date; dueDate?: Date; amount: number; vatAmount?: number; currency: string; notes?: string | null; status?: CustomerInvoiceStatus }) {
  assertModulePermission(context, "finance.create_invoice");
  const invoiceNumber = await nextCustomerInvoiceNumber();
  const totalAmount = input.amount + Number(input.vatAmount ?? 0);
  const invoice = await prisma.customerInvoice.create({
    data: {
      invoiceNumber,
      accountId: input.accountId,
      projectId: input.projectId,
      quoteId: input.quoteId,
      issueDate: input.issueDate ?? new Date(),
      dueDate: input.dueDate ?? null,
      amount: input.amount,
      vatAmount: input.vatAmount ?? 0,
      totalAmount,
      paidAmount: 0,
      outstandingAmount: totalAmount,
      currency: input.currency,
      notes: input.notes,
      status: input.status ?? CustomerInvoiceStatus.draft,
      createdById: context.userId
    },
    include: invoiceInclude
  });
  await createAuditLog({ userId: context.userId, module: "finance", entityType: "CustomerInvoice", entityId: invoice.id, action: "create", newValue: invoice as unknown as Prisma.InputJsonValue });
  return invoice;
}

export async function recordCustomerPayment(context: CrmAccessContext, invoiceId: string, input: { paymentDate: Date; amount: number; method?: string | null; reference?: string | null; notes?: string | null }) {
  assertModulePermission(context, "finance.record_payment");
  const invoice = await prisma.customerInvoice.findFirst({ where: { AND: [financeVisibilityWhere(context), { id: invoiceId }] }, include: invoiceInclude });
  if (!invoice) throw new Error("Customer invoice not found");
  const payment = await prisma.customerPayment.create({
    data: {
      invoiceId,
      paymentDate: input.paymentDate,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      notes: input.notes
    }
  });
  const paidAmount = Number(invoice.paidAmount) + input.amount;
  const outstandingAmount = Math.max(0, Number(invoice.totalAmount) - paidAmount);
  const status = outstandingAmount === 0 ? CustomerInvoiceStatus.paid : CustomerInvoiceStatus.partially_paid;
  await prisma.customerInvoice.update({
    where: { id: invoiceId },
    data: { paidAmount, outstandingAmount, status }
  });
  await createAuditLog({ userId: context.userId, module: "finance", entityType: "CustomerPayment", entityId: payment.id, action: "create", newValue: payment as unknown as Prisma.InputJsonValue });
  return prisma.customerInvoice.findUniqueOrThrow({ where: { id: invoiceId }, include: invoiceInclude });
}

export async function listBillingSchedules(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["finance.read_all", "finance.manage_billing", "finance.create_invoice"]);
  return prisma.billingSchedule.findMany({
    where: billingVisibilityWhere(context),
    include: billingInclude,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
  });
}

export async function createBillingSchedule(context: CrmAccessContext, input: { projectId: string; description: string; trigger: BillingScheduleTrigger; percentage?: number | null; amount: number; dueDate?: Date; status?: BillingScheduleStatus }) {
  assertModulePermission(context, "finance.manage_billing");
  const schedule = await prisma.billingSchedule.create({
    data: input,
    include: billingInclude
  });
  await createAuditLog({ userId: context.userId, module: "finance", entityType: "BillingSchedule", entityId: schedule.id, action: "create", newValue: schedule as unknown as Prisma.InputJsonValue });
  return schedule;
}

export async function ensureDefaultProjectBillingSchedule(context: CrmAccessContext, projectId: string) {
  assertAnyModulePermission(context, ["finance.manage_billing", "finance.read_all"]);
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
  if (!project) throw new Error("Project not found");
  const existing = await prisma.billingSchedule.count({ where: { projectId } });
  if (existing > 0) return listBillingSchedules(context);
  const contractValue = Number(project.commercialValue);
  const upfront = Number((contractValue * 0.75).toFixed(2));
  const completion = Number((contractValue - upfront).toFixed(2));
  await prisma.billingSchedule.createMany({
    data: [
      {
        projectId,
        description: "75% upfront",
        trigger: BillingScheduleTrigger.upfront,
        percentage: 75,
        amount: upfront,
        status: BillingScheduleStatus.pending
      },
      {
        projectId,
        description: "25% on completion",
        trigger: BillingScheduleTrigger.completion,
        percentage: 25,
        amount: completion,
        status: BillingScheduleStatus.pending
      }
    ]
  });
  return listBillingSchedules(context);
}

export async function getFinanceDashboard(context: CrmAccessContext) {
  const [invoices, schedules, approvedExpenses] = await Promise.all([
    listCustomerInvoices(context),
    listBillingSchedules(context),
    prisma.expenseClaim.findMany({
      where: isAdminContext(context) || context.permissions.includes("expenses.view_all")
        ? { deletedAt: null, status: "approved" }
        : { deletedAt: null, status: "approved", userId: context.userId }
    })
  ]);
  return {
    totalInvoiced: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0),
    totalCollected: invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0),
    outstanding: invoices.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount), 0),
    overdue: invoices.filter((invoice) => invoice.dueDate && invoice.dueDate < new Date() && Number(invoice.outstandingAmount) > 0).length,
    approvedExpensesAwaitingPayment: approvedExpenses.reduce((sum, claim) => sum + Number(claim.totalAmount), 0),
    schedules
  };
}

async function nextCustomerInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const latest = await prisma.customerInvoice.findFirst({ where: { invoiceNumber: { startsWith: prefix } }, orderBy: { invoiceNumber: "desc" } });
  return `${prefix}${String(latest ? Number(latest.invoiceNumber.slice(prefix.length)) + 1 : 1).padStart(4, "0")}`;
}

function financeVisibilityWhere(context: CrmAccessContext): Prisma.CustomerInvoiceWhereInput {
  if (isAdminContext(context) || context.permissions.includes("finance.read_all") || context.permissions.includes("finance.create_invoice") || context.permissions.includes("finance.record_payment")) {
    return { deletedAt: null };
  }
  return { deletedAt: null, project: { projectManagerId: context.userId, deletedAt: null } };
}

function billingVisibilityWhere(context: CrmAccessContext): Prisma.BillingScheduleWhereInput {
  if (isAdminContext(context) || context.permissions.includes("finance.read_all") || context.permissions.includes("finance.manage_billing")) {
    return { project: { deletedAt: null } };
  }
  return { project: { deletedAt: null, projectManagerId: context.userId } };
}
