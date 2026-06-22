import { HelpdeskTicketStatus, PresalesRequestStatus, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCrmMyWork } from "@/modules/crm/my-work/my-work-service";
import { getHelpdeskDashboard } from "@/modules/helpdesk/helpdesk-service";
import { getFinanceDashboard } from "@/modules/finance/finance-service";
import { getProjectsDashboard } from "@/modules/projects/project-service";
import { getResourceScheduleOverview } from "@/modules/field-services/field-services-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export type DashboardCard = {
  title: string;
  value: string;
  helper: string;
  href: string;
};

export async function getDashboardOverview(context: CrmAccessContext) {
  const cards: DashboardCard[] = [];

  if (hasAny(context, ["crm.lead.read_all", "crm.lead.read_own", "crm.opportunity.read_all", "crm.opportunity.read_own", "crm.activity.read_all", "crm.activity.read_own"])) {
    const myWork = await getCrmMyWork(context);
    cards.push(
      { title: "My Work", value: String(myWork.leads.length + myWork.opportunities.length + myWork.activities.length), helper: `${myWork.leads.length} leads, ${myWork.opportunities.length} opportunities, ${myWork.activities.length} live activities`, href: "/crm/my-work" },
      { title: "Overdue Follow-Ups", value: String(myWork.overdueFollowUps.length), helper: `${myWork.dueFollowUps.length} due today`, href: "/crm/my-work" }
    );
  }

  if (hasAny(context, ["schedule.read_all", "schedule.read_own", "field_services.read_all", "field_services.read_own", "field_services.manage_bookings"])) {
    const resourceOverview = await getResourceScheduleOverview(context);
    cards.push(
      { title: "My Resource Bookings", value: String(resourceOverview.bookings.filter((booking) => booking.resource.userId === context.userId && booking.status !== "cancelled").length), helper: `${resourceOverview.conflictBookings} bookings need conflict review`, href: "/field-services/schedule" }
    );
  }

  if (hasAny(context, ["leave.request", "leave.approve", "leave.view_team"])) {
    const [mine, approvals] = await Promise.all([
      prisma.leaveRequest.count({ where: { deletedAt: null, userId: context.userId } }),
      hasAny(context, ["leave.approve"]) ? prisma.leaveRequest.count({ where: { deletedAt: null, status: "submitted" } }) : Promise.resolve(0)
    ]);
    cards.push({ title: "My Leave Requests", value: String(mine), helper: approvals > 0 ? `${approvals} approvals waiting for you` : "Your submitted and approved leave requests", href: hasAny(context, ["leave.approve"]) ? "/leave/approvals" : "/leave" });
  }

  if (hasAny(context, ["expenses.create", "expenses.view_all", "expenses.approve"])) {
    const [mine, approvals] = await Promise.all([
      prisma.expenseClaim.count({ where: { deletedAt: null, userId: context.userId } }),
      hasAny(context, ["expenses.approve", "expenses.view_all"]) ? prisma.expenseClaim.count({ where: { deletedAt: null, status: "submitted" } }) : Promise.resolve(0)
    ]);
    cards.push({ title: "My Expenses", value: String(mine), helper: approvals > 0 ? `${approvals} submitted claims waiting approval` : "Draft, submitted and paid claims", href: "/expenses" });
  }

  if (hasAny(context, ["helpdesk.read_all", "helpdesk.read_assigned", "helpdesk.create", "helpdesk.update"])) {
    const helpdesk = await getHelpdeskDashboard(context);
    cards.push(
      { title: "My Tickets", value: String(helpdesk.tickets.filter((ticket) => ticket.assignedToId === context.userId || ticket.raisedByUserId === context.userId).length), helper: `${helpdesk.breaches} SLA breaches across visible tickets`, href: "/helpdesk/tickets" },
      { title: "Helpdesk SLA Breaches", value: String(helpdesk.breaches), helper: `${helpdesk.openTickets} open tickets in view`, href: "/helpdesk" }
    );
  }

  if (hasAny(context, ["quotes.approve", "leave.approve", "expenses.approve", "procurement.approve"])) {
    const [quoteApprovals, leaveApprovals, expenseApprovals, procurementApprovals] = await Promise.all([
      hasAny(context, ["quotes.approve"]) ? prisma.quote.count({ where: { deletedAt: null, status: QuoteStatus.internal_review } }) : Promise.resolve(0),
      hasAny(context, ["leave.approve"]) ? prisma.leaveRequest.count({ where: { deletedAt: null, status: "submitted" } }) : Promise.resolve(0),
      hasAny(context, ["expenses.approve"]) ? prisma.expenseClaim.count({ where: { deletedAt: null, status: "submitted" } }) : Promise.resolve(0),
      hasAny(context, ["procurement.approve"]) ? prisma.purchaseOrder.count({ where: { deletedAt: null, status: "submitted" } }) : Promise.resolve(0)
    ]);
    cards.push({
      title: "Approvals Waiting",
      value: String(quoteApprovals + leaveApprovals + expenseApprovals + procurementApprovals),
      helper: `${quoteApprovals} quotes, ${leaveApprovals} leave, ${expenseApprovals} expenses, ${procurementApprovals} POs`,
      href: approvalsHref(context)
    });
  }

  if (hasAny(context, ["projects.read_all", "projects.read_assigned", "projects.update"])) {
    const projects = await getProjectsDashboard(context);
    cards.push({
      title: "Project RAG",
      value: String(projects.projects.filter((project) => project.ragStatus === "red").length),
      helper: `${projects.projects.filter((project) => project.status !== "closed" && project.status !== "cancelled").length} visible active projects`,
      href: "/projects"
    });
  }

  if (hasAny(context, ["finance.read_all", "finance.create_invoice", "finance.record_payment", "finance.manage_billing"])) {
    const finance = await getFinanceDashboard(context);
    cards.push({
      title: "Finance Outstanding",
      value: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(finance.outstanding),
      helper: `${finance.overdue} overdue invoices and ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(finance.approvedExpensesAwaitingPayment)} approved expenses awaiting payment`,
      href: "/finance"
    });
  }

  if (hasAny(context, ["presales.read_all", "presales.read_assigned", "presales.create", "presales.update"])) {
    const [openRequests, awaitingCustomer] = await Promise.all([
      prisma.presalesRequest.count({ where: { deletedAt: null, status: { notIn: [PresalesRequestStatus.complete, PresalesRequestStatus.cancelled] } } }),
      prisma.presalesRequest.count({ where: { deletedAt: null, status: "waiting_customer" } })
    ]);
    cards.push({
      title: "Pre-Sales Queue",
      value: String(openRequests),
      helper: `${awaitingCustomer} waiting on customer actions`,
      href: "/presales"
    });
  }

  return cards;
}

function hasAny(context: CrmAccessContext, permissions: string[]) {
  return context.permissionLevel === "administrator" || permissions.some((permission) => context.permissions.includes(permission));
}

function approvalsHref(context: CrmAccessContext) {
  if (hasAny(context, ["quotes.approve"])) return "/quotes";
  if (hasAny(context, ["leave.approve"])) return "/leave/approvals";
  if (hasAny(context, ["expenses.approve"])) return "/expenses/approvals";
  if (hasAny(context, ["procurement.approve"])) return "/procurement/purchase-orders";
  return "/dashboard";
}
