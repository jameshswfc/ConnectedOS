import PDFDocument from "pdfkit";
import { ExpenseCategory, ExpenseClaimStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { assertAnyModulePermission, assertModulePermission, isAdminContext } from "@/modules/operations/module-permissions";
import type { ExpenseClaimCreateInput, ExpenseLineCreateInput } from "@/modules/expenses/expense-schemas";
import { createAuditLog } from "@/services/audit/audit-service";
import { uploadFileToSharePointStub } from "@/services/documents/sharepoint-document-service";
import { sendTemplatedEmail, sendTemplatedEmailToUserIds } from "@/services/email/email-service";
import { createNotification } from "@/services/notifications/notification-service";
import { findPreferredApprovers } from "@/services/users/user-service";

const expenseInclude = {
  user: true,
  project: true,
  resourceBooking: { include: { resource: true } },
  account: true,
  approvedBy: true,
  rejectedBy: true,
  paidBy: true,
  lines: { where: { deletedAt: null }, include: { receiptDocument: true }, orderBy: [{ expenseDate: "asc" }, { createdAt: "asc" }] }
} satisfies Prisma.ExpenseClaimInclude;

export type ExpenseUploadFile = {
  fileName: string;
  fileType?: string;
  buffer: Buffer;
};

export async function listExpenseClaims(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["expenses.create", "expenses.view_all", "expenses.approve"]);
  return prisma.expenseClaim.findMany({
    where: expenseVisibilityWhere(context),
    include: expenseInclude,
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function getExpenseClaim(context: CrmAccessContext, id: string) {
  assertAnyModulePermission(context, ["expenses.create", "expenses.view_all", "expenses.approve"]);
  const claim = await prisma.expenseClaim.findFirst({
    where: { AND: [expenseVisibilityWhere(context), { id }] },
    include: expenseInclude
  });
  if (!claim) throw new Error("Expense claim not found");
  return claim;
}

export async function createExpenseClaim(context: CrmAccessContext, input: ExpenseClaimCreateInput) {
  assertModulePermission(context, "expenses.create");
  const userId = isAdminContext(context) || context.permissions.includes("expenses.view_all") ? input.userId ?? context.userId : context.userId;
  const claimNumber = await nextExpenseClaimNumber();
  const claim = await prisma.expenseClaim.create({
    data: {
      claimNumber,
      userId,
      projectId: input.projectId,
      resourceBookingId: input.resourceBookingId,
      accountId: input.accountId,
      currency: input.currency,
      notes: input.notes
    },
    include: expenseInclude
  });
  await createAuditLog({ userId: context.userId, module: "expenses", entityType: "ExpenseClaim", entityId: claim.id, action: "create", newValue: claim as unknown as Prisma.InputJsonValue });
  return claim;
}

export async function addExpenseLine(context: CrmAccessContext, claimId: string, input: ExpenseLineCreateInput, receiptFile?: ExpenseUploadFile | null) {
  const claim = await getExpenseClaim(context, claimId);
  assertExpenseClaimOwner(context, claim.userId);
  const amount = input.category === ExpenseCategory.mileage
    ? Number(input.mileageMiles ?? 0) * Number(input.mileageRate ?? 0.45)
    : input.amount;
  let receiptDocumentId: string | undefined;
  if (receiptFile) {
    const document = await uploadFileToSharePointStub({
      folderPath: `ConnectedOS/Expenses/${claim.claimNumber} ${claim.user.displayName}`,
      fileName: receiptFile.fileName,
      fileType: receiptFile.fileType,
      buffer: receiptFile.buffer,
      entityType: "ExpenseClaim",
      entityId: claim.id,
      uploadedById: context.userId
    });
    receiptDocumentId = document.id;
  }
  const line = await prisma.expenseLine.create({
    data: {
      claimId,
      expenseDate: input.expenseDate,
      category: input.category,
      description: input.description,
      amount,
      vatAmount: input.vatAmount ?? null,
      currency: input.currency,
      receiptDocumentId,
      mileageMiles: input.mileageMiles ?? null,
      mileageRate: input.mileageRate ?? (input.category === ExpenseCategory.mileage ? 0.45 : null),
      mileageFrom: input.mileageFrom,
      mileageTo: input.mileageTo,
      projectId: input.projectId,
      resourceBookingId: input.resourceBookingId
    }
  });
  await recalculateExpenseClaimTotal(claimId);
  await createAuditLog({ userId: context.userId, module: "expenses", entityType: "ExpenseLine", entityId: line.id, action: "create", newValue: line as unknown as Prisma.InputJsonValue });
  return getExpenseClaim(context, claimId);
}

export async function updateExpenseStatus(context: CrmAccessContext, claimId: string, status: ExpenseClaimStatus, notes?: string | null, rejectionReason?: string | null) {
  const claim = await getExpenseClaim(context, claimId);
  if (status === ExpenseClaimStatus.submitted) {
    assertExpenseClaimOwner(context, claim.userId);
    const approvers = await findPreferredApprovers("james@connectedhsp.com", "James Harrison");
    if (approvers[0]) {
      await createNotification({
        userId: approvers[0].id,
        title: "Expense claim submitted",
        body: `${claim.user.displayName} submitted ${claim.claimNumber} for ${formatCurrency(Number(claim.totalAmount), claim.currency)}.`,
        metadata: { href: `/expenses/${claim.id}` }
      });
      await sendTemplatedEmailToUserIds([approvers[0].id], () => ({
        title: "Expense claim submitted",
        summary: `${claim.user.displayName} submitted ${claim.claimNumber} for approval.`,
        details: [
          { label: "Claim", value: claim.claimNumber },
          { label: "Claimant", value: claim.user.displayName },
          { label: "Amount", value: formatCurrency(Number(claim.totalAmount), claim.currency) },
          { label: "Project", value: claim.project?.name ?? "-" }
        ],
        actionLabel: "Open expense claim",
        actionHref: `/expenses/${claim.id}`
      }));
    }
  } else if (([
    ExpenseClaimStatus.approved,
    ExpenseClaimStatus.rejected,
    ExpenseClaimStatus.queried,
    ExpenseClaimStatus.paid
  ] as ExpenseClaimStatus[]).includes(status)) {
    assertAnyModulePermission(context, ["expenses.approve", "expenses.view_all", "expenses.pay"]);
  }
  const updated = await prisma.expenseClaim.update({
    where: { id: claimId },
    data: {
      status,
      notes: notes ?? claim.notes,
      submittedAt: status === ExpenseClaimStatus.submitted ? new Date() : claim.submittedAt,
      approvedById: status === ExpenseClaimStatus.approved ? context.userId : claim.approvedById,
      approvedAt: status === ExpenseClaimStatus.approved ? new Date() : claim.approvedAt,
      rejectedById: status === ExpenseClaimStatus.rejected ? context.userId : claim.rejectedById,
      rejectedAt: status === ExpenseClaimStatus.rejected ? new Date() : claim.rejectedAt,
      rejectionReason: status === ExpenseClaimStatus.rejected ? rejectionReason ?? "No reason supplied" : claim.rejectionReason,
      paidById: status === ExpenseClaimStatus.paid ? context.userId : claim.paidById,
      paidAt: status === ExpenseClaimStatus.paid ? new Date() : claim.paidAt
    },
    include: expenseInclude
  });
  await createAuditLog({ userId: context.userId, module: "expenses", entityType: "ExpenseClaim", entityId: updated.id, action: status, previousValue: claim as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue });
  await createNotification({
    userId: claim.userId,
    title: `Expense claim ${status.replaceAll("_", " ")}`,
    body: `${claim.claimNumber} is now ${status.replaceAll("_", " ")}.`,
    metadata: { href: `/expenses/${claim.id}` }
  });
  if (claim.user.email) {
    await sendTemplatedEmail({
      to: claim.user.email,
      title: `Expense claim ${status.replaceAll("_", " ")}`,
      summary: `${claim.claimNumber} is now ${status.replaceAll("_", " ")}.`,
      details: [
        { label: "Claim", value: claim.claimNumber },
        { label: "Amount", value: formatCurrency(Number(updated.totalAmount), updated.currency) },
        { label: "Status", value: status.replaceAll("_", " ") },
        { label: "Notes", value: notes ?? updated.notes ?? undefined }
      ],
      actionLabel: "Open expense claim",
      actionHref: `/expenses/${claim.id}`
    });
  }
  return updated;
}

export async function generateExpenseReceiptPack(context: CrmAccessContext, claimId: string) {
  const claim = await getExpenseClaim(context, claimId);
  const document = new PDFDocument({ margin: 48, size: "A4" });
  const chunks: Buffer[] = [];
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const finished = new Promise<Buffer>((resolve, reject) => {
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

  document.fontSize(20).text(`Expense Claim ${claim.claimNumber}`);
  document.moveDown();
  document.fontSize(11).text(`Claimant: ${claim.user.displayName}`);
  document.text(`Status: ${claim.status.replaceAll("_", " ")}`);
  document.text(`Total: ${formatCurrency(Number(claim.totalAmount), claim.currency)}`);
  document.text(`Project: ${claim.project?.name ?? "-"}`);
  document.text(`Notes: ${claim.notes ?? "-"}`);
  document.moveDown();
  for (const line of claim.lines) {
    document.fontSize(12).text(`${line.expenseDate.toISOString().slice(0, 10)} - ${line.category.replaceAll("_", " ")} - ${line.description}`);
    document.fontSize(10).text(`Amount: ${formatCurrency(Number(line.amount), line.currency)}`);
    if (line.mileageMiles) {
      document.text(`Mileage: ${line.mileageFrom ?? "-"} to ${line.mileageTo ?? "-"} - ${line.mileageMiles} miles @ ${line.mileageRate ?? 0.45}`);
    }
    if (line.receiptDocument?.fileName) {
      document.text(`Receipt: ${line.receiptDocument.fileName}`);
    }
    document.moveDown(0.5);
  }
  document.end();
  return finished;
}

async function recalculateExpenseClaimTotal(claimId: string) {
  const lines = await prisma.expenseLine.findMany({ where: { claimId, deletedAt: null }, select: { amount: true, vatAmount: true } });
  const totalAmount = lines.reduce((sum, line) => sum + Number(line.amount) + Number(line.vatAmount ?? 0), 0);
  await prisma.expenseClaim.update({
    where: { id: claimId },
    data: { totalAmount }
  });
}

async function nextExpenseClaimNumber() {
  const year = new Date().getFullYear();
  const prefix = `EXP-${year}-`;
  const latest = await prisma.expenseClaim.findFirst({
    where: { claimNumber: { startsWith: prefix } },
    orderBy: { claimNumber: "desc" }
  });
  const nextSequence = latest ? Number(latest.claimNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

function assertExpenseClaimOwner(context: CrmAccessContext, userId: string) {
  if (isAdminContext(context) || context.permissions.includes("expenses.view_all") || userId === context.userId) return;
  throw new Error("Missing permission: expenses.create");
}

function expenseVisibilityWhere(context: CrmAccessContext): Prisma.ExpenseClaimWhereInput {
  if (isAdminContext(context) || context.permissions.includes("expenses.view_all") || context.permissions.includes("expenses.approve")) {
    return { deletedAt: null };
  }
  return { deletedAt: null, userId: context.userId };
}

function formatCurrency(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount || 0);
}
