import { QuoteStatus } from "@prisma/client";
import type { QuoteStatus as QuoteStatusValue } from "@prisma/client";

export const validQuoteStatusTransitions: Record<QuoteStatusValue, QuoteStatusValue[]> = {
  [QuoteStatus.draft]: [QuoteStatus.internal_review],
  [QuoteStatus.internal_review]: [QuoteStatus.approved, QuoteStatus.rejected],
  [QuoteStatus.approved]: [QuoteStatus.sent],
  [QuoteStatus.rejected]: [],
  [QuoteStatus.sent]: [QuoteStatus.accepted, QuoteStatus.declined, QuoteStatus.expired],
  [QuoteStatus.accepted]: [],
  [QuoteStatus.declined]: [],
  [QuoteStatus.expired]: []
};

export function assertValidQuoteStatusTransition(fromStatus: QuoteStatusValue, toStatus: QuoteStatusValue) {
  if (fromStatus === toStatus) return;
  if (!validQuoteStatusTransitions[fromStatus]?.includes(toStatus)) {
    throw new Error(`Invalid quote status transition: ${fromStatus} to ${toStatus}`);
  }
}

export function statusTimestampField(status: QuoteStatusValue) {
  switch (status) {
    case QuoteStatus.internal_review:
      return "submittedForApprovalAt" as const;
    case QuoteStatus.approved:
      return "approvedAt" as const;
    case QuoteStatus.rejected:
      return "rejectedAt" as const;
    case QuoteStatus.sent:
      return "sentAt" as const;
    case QuoteStatus.accepted:
      return "acceptedAt" as const;
    case QuoteStatus.declined:
      return "declinedAt" as const;
    case QuoteStatus.expired:
      return "expiredAt" as const;
    default:
      return null;
  }
}
