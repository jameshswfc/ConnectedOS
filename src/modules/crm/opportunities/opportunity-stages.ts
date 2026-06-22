import { OpportunityStage } from "@prisma/client";
import type { OpportunityStage as OpportunityStageValue } from "@prisma/client";

export type OpportunityStageDefinition = {
  value: OpportunityStageValue;
  label: string;
  probabilityPercent: number;
};

export const opportunityStageDefinitions: OpportunityStageDefinition[] = [
  { value: OpportunityStage.lead, label: "Lead", probabilityPercent: 0 },
  { value: OpportunityStage.qualified, label: "Qualified", probabilityPercent: 10 },
  { value: OpportunityStage.pre_sales_solution_design, label: "Pre-Sales / Solution Design", probabilityPercent: 20 },
  { value: OpportunityStage.proposal_sent, label: "Proposal Sent", probabilityPercent: 30 },
  { value: OpportunityStage.negotiation, label: "Negotiation", probabilityPercent: 50 },
  { value: OpportunityStage.proposal_verbally_accepted, label: "Proposal Verbally Accepted", probabilityPercent: 75 },
  { value: OpportunityStage.closed_won_po_received, label: "Closed Won (PO Received)", probabilityPercent: 100 },
  { value: OpportunityStage.lost, label: "Lost", probabilityPercent: 0 }
];

export const opportunityStageValues = opportunityStageDefinitions.map((definition) => definition.value) as [
  OpportunityStageValue,
  ...OpportunityStageValue[]
];

export const defaultOpportunityStage = OpportunityStage.lead;
export const CLOSED_OPPORTUNITY_STAGES = requireValidOpportunityStages([
  OpportunityStage.closed_won_po_received,
  OpportunityStage.lost
]);

export function isOpportunityStage(value: unknown): value is OpportunityStageValue {
  return opportunityStageValues.includes(value as OpportunityStageValue);
}

function requireValidOpportunityStages(values: unknown[]): OpportunityStageValue[] {
  const invalidValues = values.filter((value) => !isOpportunityStage(value));
  if (invalidValues.length > 0) {
    throw new Error(`Invalid OpportunityStage constant: ${invalidValues.map(String).join(", ")}`);
  }

  return values as OpportunityStageValue[];
}

export function getStageProbability(stage: OpportunityStageValue) {
  return opportunityStageDefinitions.find((definition) => definition.value === stage)?.probabilityPercent ?? 0;
}

export function getStageLabel(stage: OpportunityStageValue) {
  return opportunityStageDefinitions.find((definition) => definition.value === stage)?.label ?? stage;
}
