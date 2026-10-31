import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { assertSageAccess, openSageSecret, sageAuthorisation, sageConfig, sageRequestedScope, sageStateHash, sealSageSecret } from "./sage-security";
import { exchangeSageToken, fetchSageInvoices, sageTokensSchema } from "./sage-client";

const connectionId = "sage-accounting";
export async function startSageConnection(context: CrmAccessContext) {
  assertSageAccess(context, true);
  sageConfig();
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  await prisma.sageOAuthAttempt.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.sageOAuthAttempt.create({ data: { stateHash: sageStateHash(state), userId: context.userId, encryptedVerifier: sealSageSecret({ verifier, scope: sageRequestedScope() }), expiresAt: new Date(Date.now() + 600000) } });
  return sageAuthorisation(state, verifier);
}

export async function finishSageConnection(context: CrmAccessContext, code: string, state: string) {
  assertSageAccess(context, true);
  const config = sageConfig();
  const attempt = await prisma.sageOAuthAttempt.findUnique({ where: { stateHash: sageStateHash(state) } });
  if (!attempt || attempt.userId !== context.userId || attempt.expiresAt < new Date()) throw new Error("Invalid or expired Sage connection request. Please start again.");
  const consumed = await prisma.sageOAuthAttempt.deleteMany({ where: { stateHash: attempt.stateHash, userId: context.userId } });
  if (consumed.count !== 1) throw new Error("Invalid Sage connection request. Please start again.");
  const saved = openSageSecret(attempt.encryptedVerifier) as { verifier?: string; scope?: string };
  if (typeof saved.verifier !== "string" || saved.scope !== sageRequestedScope()) throw new Error("Invalid Sage connection request. Please start again.");
  const tokens = await exchangeSageToken({ grant_type: "authorization_code", code, redirect_uri: config.redirectUri, code_verifier: saved.verifier });
  if (tokens.scope !== saved.scope) throw new Error("Invalid Sage permission scope returned. Please reconnect with the requested permissions.");
  await prisma.$transaction(async (tx) => {
    // Reconnection must never mix the previous business's cache with a new business.
    const previous = await tx.sageConnection.findUnique({ where: { id: connectionId } });
    if (previous?.syncLeaseUntil && previous.syncLeaseUntil > new Date()) throw new Error("Unable to reconnect during a Sage refresh. Please try again shortly.");
    if (previous && previous.businessId !== config.businessId) await tx.sageInvoiceSnapshot.deleteMany({ where: { connectionId } });
    const values = { businessId: config.businessId, encryptedTokens: sealSageSecret(tokens), connectedById: context.userId, connectedAt: new Date(), lastError: null, syncLeaseUntil: null };
    await tx.sageConnection.upsert({ where: { id: connectionId }, create: { id: connectionId, ...values }, update: { ...values, ...(previous?.businessId !== config.businessId ? { lastSyncedAt: null } : {}) } });
    await tx.auditLog.create({ data: { userId: context.userId, module: "finance", entityType: "SageConnection", entityId: connectionId, action: "connect", newValue: { businessId: config.businessId, scope: tokens.scope } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function syncSageInvoices(context: CrmAccessContext) {
  assertSageAccess(context);
  const config = sageConfig();
  const lease = new Date(Date.now() + 300000);
  const acquired = await prisma.sageConnection.updateMany({ where: { id: connectionId, businessId: config.businessId, OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lt: new Date() } }] }, data: { syncLeaseUntil: lease } });
  if (acquired.count !== 1) throw new Error("Unable to refresh Sage. Connect the account first, or wait for the current refresh to finish.");
  try {
    const connection = await prisma.sageConnection.findUniqueOrThrow({ where: { id: connectionId } });
    let tokens = sageTokensSchema.parse(openSageSecret(connection.encryptedTokens));
    const invoices = await fetchSageInvoices(async () => {
      if (tokens.expiresAt < Date.now() + 30000) {
        tokens = await exchangeSageToken({ grant_type: "refresh_token", refresh_token: tokens.refresh_token });
        // Rotated refresh tokens must be saved even if the subsequent read fails.
        await prisma.sageConnection.update({ where: { id: connectionId }, data: { encryptedTokens: sealSageSecret(tokens) } });
      }
      return tokens.access_token;
    }, connection.businessId);
    const syncedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.sageInvoiceSnapshot.deleteMany({ where: { connectionId } });
      if (invoices.length) await tx.sageInvoiceSnapshot.createMany({ data: invoices.map((invoice) => ({ connectionId, externalId: invoice.id, invoiceNumber: invoice.invoice_number, customerName: invoice.contact.displayed_as, status: invoice.status.id, currency: invoice.currency.id, invoiceDate: new Date(invoice.date), dueDate: invoice.due_date ? new Date(invoice.due_date) : null, totalAmount: new Prisma.Decimal(invoice.total_amount), outstandingAmount: new Prisma.Decimal(invoice.outstanding_amount), syncedAt })) });
      await tx.sageConnection.update({ where: { id: connectionId }, data: { lastSyncedAt: syncedAt, lastError: null } });
      await tx.auditLog.create({ data: { userId: context.userId, module: "finance", entityType: "SageConnection", entityId: connectionId, action: "refresh_invoices", newValue: { invoiceCount: invoices.length, businessId: connection.businessId } } });
    }, { timeout: 30000 });
    return { count: invoices.length, syncedAt };
  } catch {
    // Provider errors may contain tokens or financial data. Log only a fixed classification.
    console.error("Sage invoice refresh failed", { userId: context.userId, action: "refresh_invoices", code: "SAGE_SYNC_FAILED" });
    await prisma.sageConnection.update({ where: { id: connectionId }, data: { lastError: "Refresh failed. Previous data has been retained. Check the connection or try again later." } });
    throw new Error("Unable to refresh Sage invoices. Previous data has been retained. Please reconnect or try again later.");
  } finally {
    await prisma.sageConnection.updateMany({ where: { id: connectionId, syncLeaseUntil: lease }, data: { syncLeaseUntil: null } });
  }
}

export async function getSageOverview(context: CrmAccessContext, query = "", page = 1) {
  assertSageAccess(context);
  const config = sageConfig();
  const connection = await prisma.sageConnection.findUnique({ where: { id: connectionId }, select: { businessId: true, connectedAt: true, lastSyncedAt: true, lastError: true } });
  if (!connection || connection.businessId !== config.businessId) return { connection: null, totals: [], invoices: [], count: 0 };
  const [totals, invoices, count] = await Promise.all([
    prisma.sageInvoiceSnapshot.groupBy({ by: ["currency"], where: { status: { notIn: ["DRAFT", "VOID"] } }, _sum: { totalAmount: true, outstandingAmount: true }, _count: true }),
    prisma.sageInvoiceSnapshot.findMany({ where: { OR: [{ invoiceNumber: { contains: query, mode: "insensitive" } }, { customerName: { contains: query, mode: "insensitive" } }] }, orderBy: [{ invoiceDate: "desc" }, { externalId: "asc" }], take: 50, skip: (page - 1) * 50 }),
    prisma.sageInvoiceSnapshot.count({ where: { OR: [{ invoiceNumber: { contains: query, mode: "insensitive" } }, { customerName: { contains: query, mode: "insensitive" } }] } })
  ]);
  return { connection, totals, invoices, count };
}
