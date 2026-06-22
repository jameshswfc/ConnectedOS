import type { OpportunityStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activityVisibilityWhere, assertAnyCrmPermission, opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import { CLOSED_OPPORTUNITY_STAGES, opportunityStageDefinitions } from "@/modules/crm/opportunities/opportunity-stages";
import { calculateOpportunityHealth, matchesHealthFilter, type OpportunityHealthStatus } from "@/modules/crm/opportunities/opportunity-health";
import { salespersonOpportunityWhere } from "@/modules/crm/sales/salesperson-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export type PipelineOpportunityCard = {
  id: string;
  opportunityName: string;
  stage: OpportunityStage;
  accountName: string;
  ownerName: string;
  value: number;
  weightedValue: number;
  probabilityPercent: number;
  expectedCloseDate: Date | null;
  nextActivityDate: Date | null;
  healthStatus: OpportunityHealthStatus;
};

export type PipelineStageColumn = {
  stage: OpportunityStage;
  label: string;
  probabilityPercent: number;
  opportunities: PipelineOpportunityCard[];
  unweightedValue: number;
  weightedValue: number;
};

export type ForecastMonth = {
  key: string;
  label: string;
  dealCount: number;
  unweightedValue: number;
  weightedValue: number;
  deals: PipelineOpportunityCard[];
};

const readPermissions = ["crm.dashboard.read", "crm.opportunity.read_all", "crm.opportunity.read_own"];

export function buildPipelineColumns(opportunities: PipelineOpportunityCard[]): PipelineStageColumn[] {
  return opportunityStageDefinitions.map((definition) => {
    const stageOpportunities = opportunities.filter((opportunity) => opportunity.stage === definition.value);
    return {
      stage: definition.value,
      label: definition.label,
      probabilityPercent: definition.probabilityPercent,
      opportunities: stageOpportunities,
      unweightedValue: stageOpportunities.reduce((sum, opportunity) => sum + opportunity.value, 0),
      weightedValue: stageOpportunities.reduce((sum, opportunity) => sum + opportunity.weightedValue, 0)
    };
  });
}

export function buildForecastMonths(opportunities: PipelineOpportunityCard[], now = new Date()): ForecastMonth[] {
  const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
  const grouped = new Map<string, PipelineOpportunityCard[]>();

  opportunities
    .filter((opportunity) => opportunity.expectedCloseDate)
    .forEach((opportunity) => {
      const closeDate = opportunity.expectedCloseDate as Date;
      const key = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, "0")}`;
      grouped.set(key, [...(grouped.get(key) ?? []), opportunity]);
    });

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, deals]) => {
      const [year, month] = key.split("-").map(Number);
      const labelDate = new Date(year, month - 1, 1);
      return {
        key,
        label: monthFormatter.format(labelDate || now),
        dealCount: deals.length,
        unweightedValue: deals.reduce((sum, opportunity) => sum + opportunity.value, 0),
        weightedValue: deals.reduce((sum, opportunity) => sum + opportunity.weightedValue, 0),
        deals
      };
    });
}

export async function getPipelineBoard(context: CrmAccessContext, salespersonId?: string | null, health?: OpportunityHealthStatus[]) {
  assertAnyCrmPermission(context, readPermissions);
  const opportunities = await listPipelineOpportunities(context, false, salespersonId, health);
  return buildPipelineColumns(opportunities);
}

export async function getForecast(context: CrmAccessContext, salespersonId?: string | null, health?: OpportunityHealthStatus[]) {
  assertAnyCrmPermission(context, readPermissions);
  const opportunities = await listPipelineOpportunities(context, true, salespersonId, health);
  return buildForecastMonths(opportunities);
}

async function listPipelineOpportunities(context: CrmAccessContext, openOnly: boolean, salespersonId?: string | null, health?: OpportunityHealthStatus[]): Promise<PipelineOpportunityCard[]> {
  const opportunities = await prisma.opportunity.findMany({
    where: buildPipelineOpportunityWhere(context, openOnly, salespersonId),
    include: {
      account: { select: { name: true } },
      owner: { select: { displayName: true } },
      salesActivities: {
        where: { AND: [activityVisibilityWhere(context), { completedAt: null, dueDate: { not: null } }] },
        orderBy: { dueDate: "asc" },
        take: 1,
        select: { dueDate: true }
      },
      presalesRequests: { where: { deletedAt: null }, select: { internalDeadline: true, status: true, slaStatus: true } }
    },
    orderBy: [{ expectedCloseDate: "asc" }, { updatedAt: "desc" }]
  });

  return opportunities.map((opportunity) => ({
    id: opportunity.id,
    opportunityName: opportunity.opportunityName,
    stage: opportunity.stage,
    accountName: opportunity.account.name,
    ownerName: opportunity.owner.displayName,
    value: Number(opportunity.value),
    weightedValue: Number(opportunity.weightedValue),
    probabilityPercent: opportunity.probabilityPercent,
    expectedCloseDate: opportunity.expectedCloseDate,
    nextActivityDate: opportunity.salesActivities[0]?.dueDate ?? null,
    healthStatus: calculateOpportunityHealth({
      nextActionDate: opportunity.nextActionDate,
      expectedCloseDate: opportunity.expectedCloseDate,
      lastActivityAt: opportunity.lastActivityAt,
      updatedAt: opportunity.updatedAt,
      presalesRequests: opportunity.presalesRequests
    })
  })).filter((opportunity) => matchesHealthFilter(opportunity.healthStatus, health));
}

export function buildPipelineOpportunityWhere(context: CrmAccessContext, openOnly: boolean, salespersonId?: string | null): Prisma.OpportunityWhereInput {
  const salespersonWhere = salespersonOpportunityWhere(context, salespersonId);
  return {
    AND: [
      opportunityVisibilityWhere(context),
      ...withWhere(salespersonWhere),
      openOnly ? { status: "open", stage: { notIn: CLOSED_OPPORTUNITY_STAGES } } : {}
    ]
  };
}

function withWhere<T extends object>(where: T) {
  return Object.keys(where).length > 0 ? [where] : [];
}
