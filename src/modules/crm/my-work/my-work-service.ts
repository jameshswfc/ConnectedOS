import { prisma } from "@/lib/prisma";
import { activityVisibilityWhere, assertAnyCrmPermission, leadVisibilityWhere, opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import { salespersonActivityWhere, salespersonLeadWhere, salespersonOpportunityWhere } from "@/modules/crm/sales/salesperson-service";
import { listQuotes } from "@/modules/quoting/quotes/quote-service";
import { listPresalesRequests } from "@/modules/presales/presales-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function getCrmMyWork(context: CrmAccessContext, salespersonId?: string | null) {
  assertAnyCrmPermission(context, [
    "crm.lead.read_all",
    "crm.lead.read_own",
    "crm.opportunity.read_all",
    "crm.opportunity.read_own",
    "crm.activity.read_all",
    "crm.activity.read_own"
  ]);

  const selectedOwnerId = salespersonId ?? (context.role === "Sales" ? context.userId : undefined);
  const [leads, opportunities, activities, dueFollowUps, overdueFollowUps, quotes, presalesRequests] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: [leadVisibilityWhere(context), salespersonLeadWhere(context, salespersonId)] },
      include: { owner: true },
      orderBy: [{ nextActionDate: "asc" }, { updatedAt: "desc" }],
      take: 10
    }),
    prisma.opportunity.findMany({
      where: { AND: [opportunityVisibilityWhere(context), salespersonOpportunityWhere(context, salespersonId), { status: "open" }] },
      include: { account: true, owner: true },
      orderBy: [{ nextActionDate: "asc" }, { expectedCloseDate: "asc" }, { updatedAt: "desc" }],
      take: 10
    }),
    prisma.salesActivity.findMany({
      where: { AND: [activityVisibilityWhere(context), salespersonActivityWhere(context, salespersonId), { completedAt: null }] },
      include: { account: true, lead: true, opportunity: true, owner: true },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 10
    }),
    prisma.salesActivity.findMany({
      where: {
        AND: [
          activityVisibilityWhere(context),
          salespersonActivityWhere(context, salespersonId),
          { completedAt: null, dueDate: { gte: startOfToday(), lt: startOfTomorrow() } }
        ]
      },
      include: { account: true, lead: true, opportunity: true, owner: true },
      orderBy: { dueDate: "asc" }
    }),
    prisma.salesActivity.findMany({
      where: {
        AND: [
          activityVisibilityWhere(context),
          salespersonActivityWhere(context, salespersonId),
          { completedAt: null, dueDate: { lt: startOfToday() } }
        ]
      },
      include: { account: true, lead: true, opportunity: true, owner: true },
      orderBy: { dueDate: "asc" }
    }),
    listQuotes(context, { salespersonId, myQuotes: context.role === "Sales" || salespersonId === context.userId }),
    listPresalesRequests(context, selectedOwnerId ? { salespersonId: selectedOwnerId } : {})
  ]);

  return {
    leads,
    opportunities,
    activities,
    dueFollowUps,
    overdueFollowUps,
    quotes,
    presalesRequests
  };
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
