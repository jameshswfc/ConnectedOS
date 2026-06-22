import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activityVisibilityWhere, assertAnyCrmPermission, opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import { CLOSED_OPPORTUNITY_STAGES, opportunityStageDefinitions } from "@/modules/crm/opportunities/opportunity-stages";
import { calculateOpportunityHealth, matchesHealthFilter, type OpportunityHealthStatus } from "@/modules/crm/opportunities/opportunity-health";
import { salespersonActivityWhere, salespersonOpportunityWhere } from "@/modules/crm/sales/salesperson-service";
import { quoteVisibilityWhere } from "@/modules/quoting/quotes/quote-permissions";
import { presalesVisibilityWhere } from "@/modules/presales/presales-permissions";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function getCrmDashboardStarter(context: CrmAccessContext, salespersonId?: string | null, health?: OpportunityHealthStatus[]) {
  assertAnyCrmPermission(context, ["crm.dashboard.read", "crm.opportunity.read_all", "crm.opportunity.read_own"]);
  const openOpportunityWhere = buildDashboardOpportunityWhere(context, salespersonId);
  const [opportunities, dueActivities, overdueActivities] = await Promise.all([
    prisma.opportunity.findMany({
      where: openOpportunityWhere,
      select: {
        stage: true,
        value: true,
        weightedValue: true,
        expectedCloseDate: true,
        nextActionDate: true,
        lastActivityAt: true,
        updatedAt: true,
        salesActivities: { where: activityVisibilityWhere(context), select: { createdAt: true, completedAt: true }, orderBy: { createdAt: "desc" }, take: 5 },
        presalesRequests: { where: { deletedAt: null }, select: { internalDeadline: true, status: true, slaStatus: true } }
      }
    }),
    prisma.salesActivity.findMany({
      where: { AND: [activityVisibilityWhere(context), salespersonActivityWhere(context, salespersonId), { completedAt: null, dueDate: { gte: startOfToday(), lt: startOfTomorrow() } }] },
      include: { account: true, opportunity: true, lead: true },
      orderBy: { dueDate: "asc" },
      take: 5
    }),
    prisma.salesActivity.findMany({
      where: { AND: [activityVisibilityWhere(context), salespersonActivityWhere(context, salespersonId), { completedAt: null, dueDate: { lt: startOfToday() } }] },
      include: { account: true, opportunity: true, lead: true },
      orderBy: { dueDate: "asc" },
      take: 5
    })
  ]);
  const [openPresalesRequests, quotesAwaitingApproval] = await Promise.all([
    prisma.presalesRequest.count({ where: { AND: [presalesVisibilityWhere(context), ...withWhere(presalesSalespersonWhere(context, salespersonId)), { status: { notIn: ["complete", "cancelled"] } }] } }),
    prisma.quote.count({ where: { AND: [quoteVisibilityWhere(context), ...withWhere(quoteSalespersonWhere(context, salespersonId)), { status: "internal_review" }] } })
  ]);
  const opportunitiesWithHealth = opportunities.map((opportunity) => ({ ...opportunity, healthStatus: calculateOpportunityHealth(opportunity) })).filter((opportunity) => matchesHealthFilter(opportunity.healthStatus, health));
  const totalPipelineValue = opportunitiesWithHealth.reduce((sum, opportunity) => sum + Number(opportunity.value), 0);
  const weightedPipelineValue = opportunitiesWithHealth.reduce((sum, opportunity) => sum + Number(opportunity.weightedValue), 0);
  const now = new Date();
  const closingThisMonth = opportunitiesWithHealth.filter((opportunity) => {
    if (!opportunity.expectedCloseDate) return false;
    return opportunity.expectedCloseDate.getFullYear() === now.getFullYear() && opportunity.expectedCloseDate.getMonth() === now.getMonth();
  }).length;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const closingNextMonth = opportunitiesWithHealth.filter((opportunity) => {
    if (!opportunity.expectedCloseDate) return false;
    return opportunity.expectedCloseDate.getFullYear() === nextMonth.getFullYear() && opportunity.expectedCloseDate.getMonth() === nextMonth.getMonth();
  }).length;

  const opportunitiesByStage = opportunityStageDefinitions.map((definition) => {
    const stageOpportunities = opportunitiesWithHealth.filter((opportunity) => opportunity.stage === definition.value);
    return {
      stage: definition.value,
      label: definition.label,
      probabilityPercent: definition.probabilityPercent,
      count: stageOpportunities.length,
      unweightedValue: stageOpportunities.reduce((sum, opportunity) => sum + Number(opportunity.value), 0),
      weightedValue: stageOpportunities.reduce((sum, opportunity) => sum + Number(opportunity.weightedValue), 0)
    };
  });

  return {
    total_pipeline_value: totalPipelineValue,
    weighted_pipeline_value: weightedPipelineValue,
    closing_this_month: closingThisMonth,
    closing_next_month: closingNextMonth,
    open_presales_requests: openPresalesRequests,
    quotes_awaiting_approval: quotesAwaitingApproval,
    due_activities: dueActivities,
    overdue_activities: overdueActivities,
    opportunities_by_stage: opportunitiesByStage,
    opportunities_requiring_attention: opportunitiesWithHealth.filter((opportunity) => opportunity.healthStatus !== "green").length,
    overdue_opportunities: opportunitiesWithHealth.filter((opportunity) => opportunity.healthStatus === "red").length
  };
}

export function buildDashboardOpportunityWhere(context: CrmAccessContext, salespersonId?: string | null): Prisma.OpportunityWhereInput {
  const salespersonWhere = salespersonOpportunityWhere(context, salespersonId);
  return {
    AND: [opportunityVisibilityWhere(context), ...withWhere(salespersonWhere), { status: "open", stage: { notIn: CLOSED_OPPORTUNITY_STAGES } }]
  };
}

function withWhere<T extends object>(where: T) {
  return Object.keys(where).length > 0 ? [where] : [];
}

function quoteSalespersonWhere(context: CrmAccessContext, salespersonId?: string | null): Prisma.QuoteWhereInput {
  const ownerId = selectedSalespersonOwnerId(context, salespersonId);
  return ownerId ? { ownerId } : {};
}

function presalesSalespersonWhere(context: CrmAccessContext, salespersonId?: string | null): Prisma.PresalesRequestWhereInput {
  const ownerId = selectedSalespersonOwnerId(context, salespersonId);
  return ownerId
    ? { OR: [{ requestedById: ownerId }, { opportunity: { ownerId } }] }
    : {};
}

function selectedSalespersonOwnerId(context: CrmAccessContext, salespersonId?: string | null) {
  const salespersonWhere = salespersonOpportunityWhere(context, salespersonId);
  return typeof salespersonWhere.ownerId === "string" ? salespersonWhere.ownerId : undefined;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}
