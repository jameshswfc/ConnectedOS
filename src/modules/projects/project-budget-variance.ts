import type { ProjectResourceRole } from "@prisma/client";

export const defaultProjectDayCosts: Record<string, number> = {
  project_manager: 550,
  technical_lead: 500,
  project_engineer: 450,
  field_engineer: 400,
  pre_sales_engineer: 450,
  other: 400
};

export type ProjectBudgetVarianceInput = {
  contractValue: number;
  budgetCost: number;
  invoicedAmount: number;
  collectedAmount: number;
  resourceAssignments: { role: ProjectResourceRole | string; scheduledDays: unknown; usedDays: unknown }[];
  financialEntries: { type: string; amount: unknown; status: string }[];
};

export function calculateProjectBudgetVariance(input: ProjectBudgetVarianceInput) {
  const resourceCost = input.resourceAssignments.reduce((sum, resource) => sum + Number(resource.usedDays ?? resource.scheduledDays ?? 0) * dayCost(resource.role), 0);
  const poPlaceholderCost = input.financialEntries
    .filter((entry) => entry.type === "purchase_order_placeholder" && entry.status !== "cancelled")
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  const otherCost = input.financialEntries
    .filter((entry) => entry.type === "cost" && entry.status !== "cancelled")
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  const totalForecastCost = resourceCost + poPlaceholderCost + otherCost;
  const actualCost = resourceCost + otherCost;
  const expectedMargin = input.contractValue - input.budgetCost;
  const currentForecastMargin = input.contractValue - totalForecastCost;
  const marginVariance = currentForecastMargin - expectedMargin;
  return {
    contractValue: input.contractValue,
    invoicedAmount: input.invoicedAmount,
    collectedAmount: input.collectedAmount,
    outstandingAmount: Math.max(0, input.invoicedAmount - input.collectedAmount),
    resourceCost,
    poPlaceholderCost,
    otherCost,
    totalForecastCost,
    actualCost,
    expectedMargin,
    currentForecastMargin,
    marginVariance,
    marginAtRisk: currentForecastMargin < expectedMargin * 0.75 || currentForecastMargin < 0
  };
}

function dayCost(role: ProjectResourceRole | string) {
  return defaultProjectDayCosts[String(role)] ?? defaultProjectDayCosts.other;
}
