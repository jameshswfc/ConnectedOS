import { QuoteApprovalRuleType, QuoteStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { OpportunityStage } from "@prisma/client";
import { canApproveQuoteRequest, evaluateQuoteApprovalTriggers, getLinkedOpportunityStatusSync } from "@/modules/quoting/quotes/quote-approval-service";
import { assertValidQuoteStatusTransition } from "@/modules/quoting/quotes/quote-status-workflow";

const activeRule = (ruleType: QuoteApprovalRuleType, thresholdValue: number | null) => ({
  ruleType,
  thresholdValue,
  isActive: true
});

describe("quote approval workflow", () => {
  it("triggers low margin approval below 25 percent", () => {
    const triggered = evaluateQuoteApprovalTriggers({
      sellTotal: 10000,
      marginPercent: 24.99,
      lines: []
    }, [activeRule(QuoteApprovalRuleType.low_margin, 25)]);

    expect(triggered.map((rule) => rule.ruleType)).toContain(QuoteApprovalRuleType.low_margin);
  });

  it("triggers high value approval above GBP 50,000", () => {
    const triggered = evaluateQuoteApprovalTriggers({
      sellTotal: 50000.01,
      marginPercent: 40,
      lines: []
    }, [activeRule(QuoteApprovalRuleType.high_value, 50000)]);

    expect(triggered.map((rule) => rule.ruleType)).toContain(QuoteApprovalRuleType.high_value);
  });

  it("only triggers manual override when sell price is below catalogue default", () => {
    const unchangedOrRaised = evaluateQuoteApprovalTriggers({
      sellTotal: 1000,
      marginPercent: 30,
      lines: [{ unitSell: 120, product: { defaultSellPrice: 100 } }]
    }, [activeRule(QuoteApprovalRuleType.manual_override, null)]);
    const reduced = evaluateQuoteApprovalTriggers({
      sellTotal: 1000,
      marginPercent: 30,
      lines: [{ unitSell: 90, product: { defaultSellPrice: 100 } }]
    }, [activeRule(QuoteApprovalRuleType.manual_override, null)]);

    expect(unchangedOrRaised).toHaveLength(0);
    expect(reduced.map((rule) => rule.ruleType)).toContain(QuoteApprovalRuleType.manual_override);
  });

  it("allows valid quote status transitions and rejects invalid jumps", () => {
    expect(() => assertValidQuoteStatusTransition(QuoteStatus.draft, QuoteStatus.internal_review)).not.toThrow();
    expect(() => assertValidQuoteStatusTransition(QuoteStatus.internal_review, QuoteStatus.approved)).not.toThrow();
    expect(() => assertValidQuoteStatusTransition(QuoteStatus.approved, QuoteStatus.sent)).not.toThrow();
    expect(() => assertValidQuoteStatusTransition(QuoteStatus.sent, QuoteStatus.accepted)).not.toThrow();
    expect(() => assertValidQuoteStatusTransition(QuoteStatus.draft, QuoteStatus.approved)).toThrow("Invalid quote status transition");
    expect(() => assertValidQuoteStatusTransition(QuoteStatus.draft, QuoteStatus.accepted)).toThrow("Invalid quote status transition");
  });

  it("prevents users approving their own quote without override permission", () => {
    expect(canApproveQuoteRequest({ userId: "sales-user", permissions: ["quotes.approve"] }, "sales-user", "sales-user")).toBe(false);
  });

  it("allows managers to approve another user's quote", () => {
    expect(canApproveQuoteRequest({ userId: "manager", permissions: ["quotes.approve"] }, "sales-user", "sales-user")).toBe(true);
  });

  it("allows directors to approve their own quote with override permission", () => {
    expect(canApproveQuoteRequest({ userId: "director", permissions: ["quotes.approve", "quotes.approve_own"] }, "director", "director")).toBe(true);
  });

  it("moves linked opportunities to proposal_sent when a quote is marked sent", () => {
    const sync = getLinkedOpportunityStatusSync({
      status: QuoteStatus.sent,
      currentStage: OpportunityStage.qualified,
      currentValue: 20000,
      sellTotal: 25000
    });

    expect(sync?.nextStage).toBe(OpportunityStage.proposal_sent);
    expect(sync?.probabilityPercent).toBe(30);
    expect(sync?.weightedValue).toBe(6000);
  });

  it("does not duplicate proposal_sent stage sync or move closed opportunities backwards", () => {
    expect(getLinkedOpportunityStatusSync({
      status: QuoteStatus.sent,
      currentStage: OpportunityStage.proposal_sent,
      currentValue: 15000,
      sellTotal: 15000
    })).toBeNull();

    expect(getLinkedOpportunityStatusSync({
      status: QuoteStatus.sent,
      currentStage: OpportunityStage.closed_won_po_received,
      currentValue: 15000,
      sellTotal: 15000
    })).toBeNull();
  });
});
