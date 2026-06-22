import type { OpportunityStage } from "@prisma/client";
import { getStageProbability } from "@/modules/crm/opportunities/opportunity-stages";

export function calculateWeightedValue(value: number, probabilityPercent: number) {
  return Number(((value * probabilityPercent) / 100).toFixed(2));
}

export function calculateStageFinancials(stage: OpportunityStage, value: number) {
  const probabilityPercent = getStageProbability(stage);
  return {
    probabilityPercent,
    weightedValue: calculateWeightedValue(value, probabilityPercent)
  };
}
