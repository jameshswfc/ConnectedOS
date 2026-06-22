import { PresalesRequestStatus, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { assertAnyModulePermission, isAdminContext } from "@/modules/operations/module-permissions";
import { getFinanceDashboard } from "@/modules/finance/finance-service";
import { getHelpdeskDashboard } from "@/modules/helpdesk/helpdesk-service";
import { getProjectsDashboard } from "@/modules/projects/project-service";
import { getResourceScheduleOverview } from "@/modules/field-services/field-services-service";

export async function getExecutiveReport(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["reports.executive", "reports.sales", "reports.projects", "reports.resources", "reports.finance", "reports.procurement", "reports.helpdesk"]);
  const [sales, presales, projects, resources, finance, procurement, helpdesk] = await Promise.all([
    getSalesReport(context),
    getPresalesReport(context),
    getProjectsDashboard(context, { view: "all" }),
    getResourceScheduleOverview(context),
    getFinanceDashboard(context),
    getProcurementReport(context),
    getHelpdeskDashboard(context)
  ]);
  return { sales, presales, projects, resources, finance, procurement, helpdesk };
}

export async function getSalesReport(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["reports.sales", "reports.executive"]);
  const opportunityWhere = isAdminContext(context) ? { deletedAt: null } : { deletedAt: null, ownerId: context.userId };
  const quoteWhere = isAdminContext(context) ? { deletedAt: null } : { deletedAt: null, ownerId: context.userId };
  const [opportunities, quotes] = await Promise.all([
    prisma.opportunity.findMany({ where: opportunityWhere }),
    prisma.quote.findMany({ where: quoteWhere })
  ]);
  const won = opportunities.filter((opportunity) => opportunity.status === "won").length;
  const lost = opportunities.filter((opportunity) => opportunity.status === "lost").length;
  return {
    pipelineValue: opportunities.reduce((sum, opportunity) => sum + Number(opportunity.value), 0),
    weightedPipeline: opportunities.reduce((sum, opportunity) => sum + Number(opportunity.weightedValue), 0),
    quotesAwaitingApproval: quotes.filter((quote) => quote.status === QuoteStatus.internal_review).length,
    sentQuotes: quotes.filter((quote) => quote.status === QuoteStatus.sent).length,
    acceptedQuotes: quotes.filter((quote) => quote.status === QuoteStatus.accepted).length,
    winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0
  };
}

export async function getPresalesReport(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["reports.projects", "reports.executive", "presales.read_all", "presales.read_assigned"]);
  const where = isAdminContext(context) || context.permissions.includes("presales.read_all")
    ? { deletedAt: null }
    : { deletedAt: null, OR: [{ requestedById: context.userId }, { assignedToId: context.userId }] };
  const requests = await prisma.presalesRequest.findMany({
    where,
    include: { deliverables: true, assignedTo: true }
  });
  const closedStatuses: PresalesRequestStatus[] = [PresalesRequestStatus.complete, PresalesRequestStatus.cancelled];
  return {
    openRequests: requests.filter((request) => !closedStatuses.includes(request.status)).length,
    overdueRequests: requests.filter((request) => request.slaStatus === "overdue").length,
    requestsByEngineer: requests.reduce<Record<string, number>>((totals, request) => {
      const key = request.assignedTo?.displayName ?? "Unassigned";
      totals[key] = (totals[key] ?? 0) + 1;
      return totals;
    }, {}),
    deliverablesOutstanding: requests.reduce((sum, request) => sum + request.deliverables.filter((deliverable) => deliverable.status !== "complete").length, 0)
  };
}

export async function getProcurementReport(context: CrmAccessContext) {
  assertAnyModulePermission(context, ["reports.procurement", "reports.executive", "procurement.read_all"]);
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: isAdminContext(context) || context.permissions.includes("procurement.read_all")
      ? { deletedAt: null }
      : { deletedAt: null, project: { projectManagerId: context.userId, deletedAt: null } },
    include: { supplier: true, project: true }
  });
  return {
    openPurchaseOrders: purchaseOrders.filter((po) => !["received", "cancelled", "paid"].includes(po.status)).length,
    awaitingApproval: purchaseOrders.filter((po) => po.status === "submitted").length,
    overdueDeliveries: purchaseOrders.filter((po) => po.expectedDeliveryDate && po.expectedDeliveryDate < new Date() && !["received", "cancelled"].includes(po.status)).length,
    committedProjectCost: purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0)
  };
}

export async function getModuleReport(context: CrmAccessContext, module: "projects" | "resources" | "finance" | "helpdesk") {
  if (module === "projects") return getProjectsDashboard(context, { view: "all" });
  if (module === "resources") return getResourceScheduleOverview(context);
  if (module === "finance") return getFinanceDashboard(context);
  return getHelpdeskDashboard(context);
}
