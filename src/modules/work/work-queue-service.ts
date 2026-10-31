import { prisma } from "@/lib/prisma";
import { activityVisibilityWhere, leadVisibilityWhere, opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import { presalesVisibilityWhere } from "@/modules/presales/presales-permissions";
import { projectVisibilityWhere } from "@/modules/projects/project-permissions";
import { quoteVisibilityWhere } from "@/modules/quoting/quotes/quote-permissions";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export type WorkArea = "leads" | "opportunities" | "presales" | "quotes" | "tasks" | "activities";
export type WorkItem = { id: string; area: WorkArea; title: string; customer: string; owner: string; status: string; due: string | null; href: string; nextAction: string; blocked: boolean };
export const workAreas: Record<WorkArea, string> = { leads: "Leads", opportunities: "Opportunities", presales: "Pre-Sales", quotes: "Quotes", tasks: "Project Tasks", activities: "Activities" };
export const workPermissions = ["crm.lead.read_all", "crm.lead.read_own", "crm.opportunity.read_all", "crm.opportunity.read_own", "crm.activity.read_all", "crm.activity.read_own", "presales.read_all", "presales.read_assigned", "quotes.read_all", "quotes.read_own", "projects.read_all", "projects.read_assigned"];
export function canViewWork(context: CrmAccessContext) { return context.permissionLevel === "administrator" || context.permissions.includes("admin.users") || workPermissions.some((p) => context.permissions.includes(p)); }

export function workUrgency(item: WorkItem, today = new Date().toISOString().slice(0, 10)) {
  if (item.blocked) return "Blocked";
  if (!item.due) return "No date";
  if (item.due < today) return "Overdue";
  return item.due === today ? "Due today" : "Upcoming";
}

export function prioritiseWork(items: WorkItem[], filter = "all", now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const rank = { Blocked: 0, Overdue: 1, "Due today": 2, "No date": 3, Upcoming: 4 };
  return items.filter((item) => filter === "all" || (filter === "attention" && workUrgency(item, today) !== "Upcoming") || item.area === filter)
    .sort((a, b) => rank[workUrgency(a, today)] - rank[workUrgency(b, today)] || (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.title.localeCompare(b.title));
}

// Each source uses its existing visibility predicate before selection; a joined record never grants access.
export async function getWorkQueue(context: CrmAccessContext, scope: "mine" | "visible" = "mine") {
  if (!canViewWork(context)) throw new Error("Missing permission: work queue");
  const can = (...permissions: string[]) => context.permissionLevel === "administrator" || context.permissions.includes("admin.users") || permissions.some((p) => context.permissions.includes(p));
  const mine = scope === "mine";
  const person = { select: { displayName: true } } as const;
  const account = { select: { name: true } } as const;
  const date = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
  const result: WorkItem[] = [];
  const limitedAreas: string[] = [];
  const add = (area: WorkArea, rows: WorkItem[]) => { if (rows.length > 50) limitedAreas.push(workAreas[area]); result.push(...rows.slice(0, 50)); };
  if (can("crm.lead.read_all", "crm.lead.read_own")) {
    const rows = await prisma.lead.findMany({ where: { AND: [leadVisibilityWhere(context), { status: { notIn: ["converted", "disqualified"] } }, mine ? { ownerId: context.userId } : {}] }, include: { owner: person }, orderBy: [{ nextActionDate: "asc" }, { id: "asc" }], take: 51 });
    add("leads", rows.map((r) => ({ id: r.id, area: "leads", title: r.accountName ?? r.contactName ?? "Lead", customer: r.contactName ?? "", owner: r.owner.displayName, status: r.status, due: date(r.nextActionDate), href: `/crm/leads/${r.id}`, nextAction: "Qualify customer needs and convert to opportunity", blocked: false })));
  }
  if (can("crm.opportunity.read_all", "crm.opportunity.read_own")) {
    const rows = await prisma.opportunity.findMany({ where: { AND: [opportunityVisibilityWhere(context), { status: "open" }, mine ? { ownerId: context.userId } : {}] }, include: { owner: person, account }, orderBy: [{ nextActionDate: "asc" }, { id: "asc" }], take: 51 });
    add("opportunities", rows.map((r) => ({ id: r.id, area: "opportunities", title: r.opportunityName, customer: r.account.name, owner: r.owner.displayName, status: r.stage, due: date(r.nextActionDate ?? r.expectedCloseDate), href: `/crm/opportunities/${r.id}`, nextAction: opportunityGuidance(r.stage), blocked: false })));
  }
  if (can("presales.read_all", "presales.read_assigned")) {
    const rows = await prisma.presalesRequest.findMany({ where: { AND: [presalesVisibilityWhere(context), { status: { notIn: ["complete", "cancelled"] } }, mine ? { OR: [{ assignedToId: context.userId }, { requestedById: context.userId }] } : {}] }, include: { assignedTo: person, account }, orderBy: [{ internalDeadline: "asc" }, { id: "asc" }], take: 51 });
    add("presales", rows.map((r) => ({ id: r.id, area: "presales", title: r.requestNumber, customer: r.account.name, owner: r.assignedTo?.displayName ?? "Awaiting assignment", status: r.status, due: date(r.internalDeadline), href: `/presales/${r.id}`, nextAction: r.status === "internal_review" ? "Review engineering deliverables and return to Sales" : "Complete design deliverables and record open questions", blocked: ["waiting_customer", "query_raised"].includes(r.status) })));
  }
  if (can("quotes.read_all", "quotes.read_own")) {
    const rows = await prisma.quote.findMany({ where: { AND: [quoteVisibilityWhere(context), { status: { in: ["draft", "internal_review", "approved", "sent", "rejected"] } }, mine ? { ownerId: context.userId } : {}] }, include: { owner: person, account }, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: 51 });
    add("quotes", rows.map((r) => ({ id: r.id, area: "quotes", title: r.quoteNumber, customer: r.account.name, owner: r.owner?.displayName ?? "Awaiting owner", status: r.status, due: null, href: `/quotes/${r.id}`, nextAction: r.status === "approved" ? "Export proposal and record sending to customer" : r.status === "sent" ? "Follow up the customer decision" : r.status === "internal_review" ? "Await authorised commercial approval" : "Build scope and pricing, then submit for approval", blocked: r.status === "rejected" })));
  }
  if (can("projects.read_all", "projects.read_assigned")) {
    const rows = await prisma.projectTask.findMany({ where: { deletedAt: null, status: { notIn: ["complete", "cancelled"] }, project: { AND: [projectVisibilityWhere(context), { status: { notIn: ["completed", "closed", "cancelled"] } }] }, ...(mine ? { OR: [{ assignedToId: context.userId }, { ownerId: context.userId }] } : {}) }, include: { assignedTo: person, owner: person, project: { select: { projectNumber: true, account } } }, orderBy: [{ endDate: "asc" }, { id: "asc" }], take: 51 });
    add("tasks", rows.map((r) => ({ id: r.id, area: "tasks", title: `${r.project.projectNumber}: ${r.title}`, customer: r.project.account.name, owner: r.assignedTo?.displayName ?? r.owner?.displayName ?? "Awaiting assignment", status: r.status, due: date(r.endDate), href: `/projects/${r.projectId}#tasks`, nextAction: r.status === "blocked" ? "Resolve blocker with the project manager" : "Update progress and record actual effort on completion", blocked: r.status === "blocked" })));
  }
  if (can("crm.activity.read_all", "crm.activity.read_own")) {
    const rows = await prisma.salesActivity.findMany({ where: { AND: [activityVisibilityWhere(context), { completedAt: null }, mine ? { ownerId: context.userId } : {}] }, include: { owner: person, account }, orderBy: [{ dueDate: "asc" }, { id: "asc" }], take: 51 });
    add("activities", rows.map((r) => ({ id: r.id, area: "activities", title: r.subject, customer: r.account?.name ?? "", owner: r.owner.displayName, status: "open", due: date(r.dueDate), href: `/crm/activities/${r.id}`, nextAction: "Record the outcome and agree the next follow-up", blocked: false })));
  }
  return { items: prioritiseWork(result), limitedAreas };
}

export function opportunityGuidance(stage: string) {
  if (stage === "pre_sales_solution_design") return "Review technical design and deliverables with Pre-Sales";
  if (["proposal_sent", "negotiation", "proposal_verbally_accepted"].includes(stage)) return "Confirm customer decision and accepted commercial scope";
  if (stage === "closed_won_po_received") return "Review the linked project handover and assign delivery ownership";
  if (stage === "lost") return "Record the loss reason and retain customer history";
  return "Confirm contact, scope, budget and close date; request Pre-Sales when needed";
}
