import { describe, expect, it } from "vitest";
import { OpportunityStage } from "@prisma/client";
import { calculateStageFinancials, calculateWeightedValue } from "@/modules/crm/opportunities/opportunity-calculations";
import {
  CLOSED_OPPORTUNITY_STAGES,
  getStageLabel,
  getStageProbability,
  opportunityStageDefinitions
} from "@/modules/crm/opportunities/opportunity-stages";

describe("opportunity calculations", () => {
  it("calculates weighted opportunity value from value and probability", () => {
    expect(calculateWeightedValue(50000, 40)).toBe(20000);
  });

  it("rounds to two decimal places", () => {
    expect(calculateWeightedValue(999.99, 33)).toBe(330);
  });

  it("uses the Connected Hospitality stage probability model", () => {
    expect(opportunityStageDefinitions).toHaveLength(8);
    expect(getStageProbability(OpportunityStage.lead)).toBe(0);
    expect(getStageProbability(OpportunityStage.qualified)).toBe(10);
    expect(getStageProbability(OpportunityStage.proposal_sent)).toBe(30);
    expect(getStageProbability(OpportunityStage.closed_won_po_received)).toBe(100);
    expect(getStageProbability(OpportunityStage.lost)).toBe(0);
    expect(getStageLabel(OpportunityStage.pre_sales_solution_design)).toBe("Pre-Sales / Solution Design");
  });

  it("keeps closed opportunity stages defined", () => {
    expect(CLOSED_OPPORTUNITY_STAGES).toEqual([OpportunityStage.closed_won_po_received, OpportunityStage.lost]);
    expect(CLOSED_OPPORTUNITY_STAGES).not.toContain(undefined);
  });

  it("uses only Prisma OpportunityStage enum values for shared stage constants", () => {
    const prismaStageValues = Object.values(OpportunityStage);

    expect(opportunityStageDefinitions.every((stage) => prismaStageValues.includes(stage.value))).toBe(true);
    expect(CLOSED_OPPORTUNITY_STAGES.every((stage) => prismaStageValues.includes(stage))).toBe(true);
  });

  it("recalculates probability and weighted value for stage changes", () => {
    expect(calculateStageFinancials(OpportunityStage.negotiation, 80000)).toEqual({
      probabilityPercent: 50,
      weightedValue: 40000
    });
  });
});
