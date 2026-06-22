import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { createNotification } from "@/services/notifications/notification-service";

export const QUOTE_EXPIRY_DAYS = 30;

export function quoteExpiryCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - QUOTE_EXPIRY_DAYS);
  return cutoff;
}

export function shouldExpireSentQuote(sentAt: Date | null | undefined, now = new Date()) {
  if (!sentAt) return false;
  return sentAt <= quoteExpiryCutoff(now);
}

export async function expireSentQuotes(now = new Date()) {
  const cutoff = quoteExpiryCutoff(now);
  const quotes = await prisma.quote.findMany({
    where: {
      status: QuoteStatus.sent,
      sentAt: { lte: cutoff },
      deletedAt: null
    },
    include: { owner: true }
  });

  for (const quote of quotes) {
    const expiredQuote = await prisma.quote.update({
      where: { id: quote.id },
      data: { status: QuoteStatus.expired, expiredAt: now, updatedById: null }
    });
    await prisma.quoteVersion.updateMany({
      where: { quoteId: quote.id, status: QuoteStatus.sent },
      data: { status: QuoteStatus.expired, updatedById: null }
    });
    await createAuditLog({
      userId: null,
      module: "quoting",
      entityType: "Quote",
      entityId: quote.id,
      action: "auto_expire",
      previousValue: { status: quote.status, sentAt: quote.sentAt },
      newValue: { status: expiredQuote.status, expiredAt: expiredQuote.expiredAt, message: `Quote ${quote.quoteNumber} automatically expired after 30 days.` }
    });
    await createNotification({
      userId: quote.ownerId,
      title: `Quote ${quote.quoteNumber} expired`,
      body: `Quote ${quote.quoteNumber} automatically expired after 30 days.`,
      metadata: { quoteId: quote.id, link: `/quotes/${quote.id}`, status: "expired" }
    });
  }

  return quotes.length;
}
