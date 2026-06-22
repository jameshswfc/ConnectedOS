import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { prisma } from "@/lib/prisma";
import { isAdminContext } from "@/modules/operations/module-permissions";
import { projectVisibilityWhere } from "@/modules/projects/project-permissions";

export type SearchResult = {
  module: string;
  title: string;
  reference: string;
  status?: string | null;
  subtitle?: string | null;
  href: string;
};

export async function runGlobalSearch(context: CrmAccessContext, rawQuery: string) {
  const query = rawQuery.trim();
  if (!query) return [];
  const contains = { contains: query, mode: "insensitive" as const };
  const results: SearchResult[] = [];

  const [
    accounts,
    contacts,
    leads,
    opportunities,
    quotes,
    presalesRequests,
    projects,
    resources,
    suppliers,
    purchaseOrders,
    invoices,
    assets,
    tickets
  ] = await Promise.all([
    canRead(context, ["crm.account.read_all", "crm.account.read_own", "crm.account.create", "crm.account.update"])
      ? prisma.account.findMany({ where: accountWhere(context, query), select: { id: true, name: true, status: true }, take: 8, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canRead(context, ["crm.contact.read_all", "crm.contact.read_own", "crm.contact.create", "crm.contact.update"])
      ? prisma.contact.findMany({ where: contactWhere(context, query), select: { id: true, firstName: true, lastName: true, email: true, account: { select: { name: true } }, status: true }, take: 8, orderBy: { firstName: "asc" } })
      : Promise.resolve([]),
    canRead(context, ["crm.lead.read_all", "crm.lead.read_own", "crm.lead.create", "crm.lead.update"])
      ? prisma.lead.findMany({ where: leadWhere(context, query), select: { id: true, accountName: true, contactName: true, email: true, status: true }, take: 8, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    canRead(context, ["crm.opportunity.read_all", "crm.opportunity.read_own", "crm.opportunity.create", "crm.opportunity.update"])
      ? prisma.opportunity.findMany({ where: opportunityWhere(context, query), select: { id: true, opportunityName: true, stage: true, account: { select: { name: true } } }, take: 8, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    canRead(context, ["quotes.read_all", "quotes.read_own", "quotes.create", "quotes.update"])
      ? prisma.quote.findMany({ where: quoteWhere(context, query), select: { id: true, quoteNumber: true, title: true, status: true, account: { select: { name: true } } }, take: 8, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    canRead(context, ["presales.read_all", "presales.read_assigned", "presales.create", "presales.update"])
      ? prisma.presalesRequest.findMany({ where: presalesWhere(context, query), select: { id: true, requestNumber: true, description: true, status: true, account: { select: { name: true } } }, take: 8, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    canRead(context, ["projects.read_all", "projects.read_assigned", "projects.create", "projects.update"])
      ? prisma.project.findMany({ where: projectWhere(context, query), select: { id: true, projectNumber: true, name: true, status: true, account: { select: { name: true } } }, take: 8, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    canRead(context, ["field_services.read_all", "field_services.read_own", "field_services.manage_resources"])
      ? prisma.resource.findMany({ where: resourceWhere(context, query), select: { id: true, displayName: true, roleType: true, companyName: true }, take: 8, orderBy: { displayName: "asc" } })
      : Promise.resolve([]),
    canRead(context, ["procurement.read_all", "procurement.create", "procurement.approve", "procurement.finance"])
      ? prisma.supplier.findMany({ where: supplierWhere(context, query), select: { id: true, name: true, email: true, phone: true, active: true }, take: 8, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canRead(context, ["procurement.read_all", "procurement.create", "procurement.approve", "procurement.finance"])
      ? prisma.purchaseOrder.findMany({ where: purchaseOrderWhere(context, query), select: { id: true, poNumber: true, status: true, supplier: { select: { name: true } } }, take: 8, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    canRead(context, ["finance.read_all", "finance.create_invoice", "finance.record_payment"])
      ? prisma.customerInvoice.findMany({ where: invoiceWhere(context, query), select: { id: true, invoiceNumber: true, status: true, account: { select: { name: true } } }, take: 8, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    canRead(context, ["assets.read_all", "assets.read_assigned", "assets.create", "assets.update"])
      ? prisma.asset.findMany({ where: assetWhere(context, query), select: { id: true, assetNumber: true, serialNumber: true, macAddress: true, status: true, description: true }, take: 8, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    canRead(context, ["helpdesk.read_all", "helpdesk.read_assigned", "helpdesk.create", "helpdesk.update"])
      ? prisma.helpdeskTicket.findMany({ where: helpdeskWhere(context, query), select: { id: true, ticketNumber: true, title: true, status: true, account: { select: { name: true } } }, take: 8, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([])
  ]);

  results.push(...accounts.map((row) => ({ module: "Accounts", title: row.name, reference: row.name, status: row.status, href: `/crm/accounts/${row.id}` })));
  results.push(...contacts.map((row) => ({ module: "Contacts", title: `${row.firstName} ${row.lastName}`, reference: row.email ?? row.account.name, status: row.status, subtitle: row.account.name, href: `/crm/contacts/${row.id}` })));
  results.push(...leads.map((row) => ({ module: "Leads", title: row.contactName ?? row.accountName ?? row.email ?? "Lead", reference: row.email ?? row.accountName ?? "Lead", status: row.status, href: `/crm/leads/${row.id}` })));
  results.push(...opportunities.map((row) => ({ module: "Opportunities", title: row.opportunityName, reference: row.account.name, status: row.stage, subtitle: row.account.name, href: `/crm/opportunities/${row.id}` })));
  results.push(...quotes.map((row) => ({ module: "Quotes", title: row.title, reference: row.quoteNumber, status: row.status, subtitle: row.account.name, href: `/quotes/${row.id}` })));
  results.push(...presalesRequests.map((row) => ({ module: "Pre-Sales", title: row.requestNumber, reference: row.requestNumber, status: row.status, subtitle: row.account.name, href: `/presales/${row.id}` })));
  results.push(...projects.map((row) => ({ module: "Projects", title: row.name, reference: row.projectNumber, status: row.status, subtitle: row.account.name, href: `/projects/${row.id}` })));
  results.push(...resources.map((row) => ({ module: "Resources", title: row.displayName, reference: row.companyName ?? row.roleType ?? "Resource", subtitle: row.companyName, href: `/field-services/resources/${row.id}` })));
  results.push(...suppliers.map((row) => ({ module: "Suppliers", title: row.name, reference: row.email ?? row.phone ?? row.name, status: row.active ? "active" : "inactive", href: `/procurement/suppliers` })));
  results.push(...purchaseOrders.map((row) => ({ module: "Purchase Orders", title: row.poNumber, reference: row.poNumber, status: row.status, subtitle: row.supplier.name, href: `/procurement/purchase-orders/${row.id}` })));
  results.push(...invoices.map((row) => ({ module: "Invoices", title: row.invoiceNumber, reference: row.invoiceNumber, status: row.status, subtitle: row.account.name, href: `/finance/invoices/${row.id}` })));
  results.push(...assets.map((row) => ({ module: "Assets", title: row.assetNumber, reference: row.serialNumber ?? row.macAddress ?? row.description, status: row.status, subtitle: row.description, href: `/assets/${row.id}` })));
  results.push(...tickets.map((row) => ({ module: "Helpdesk", title: row.title, reference: row.ticketNumber, status: row.status, subtitle: row.account?.name ?? null, href: `/helpdesk/tickets/${row.id}` })));

  return results;
}

function canRead(context: CrmAccessContext, permissions: string[]) {
  return isAdminContext(context) || permissions.some((permission) => context.permissions.includes(permission));
}

function accountWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { phone: { contains: query, mode: "insensitive" as const } }, { website: { contains: query, mode: "insensitive" as const } }] };
  if (isAdminContext(context) || context.permissions.includes("crm.account.read_all")) return { deletedAt: null, ...filter };
  return { deletedAt: null, ownerId: context.userId, ...filter };
}

function contactWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ firstName: { contains: query, mode: "insensitive" as const } }, { lastName: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }, { phone: { contains: query, mode: "insensitive" as const } }, { mobile: { contains: query, mode: "insensitive" as const } }] };
  if (isAdminContext(context) || context.permissions.includes("crm.contact.read_all")) return { deletedAt: null, ...filter };
  return { deletedAt: null, account: { ownerId: context.userId, deletedAt: null }, ...filter };
}

function leadWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ accountName: { contains: query, mode: "insensitive" as const } }, { contactName: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }, { phone: { contains: query, mode: "insensitive" as const } }] };
  if (isAdminContext(context) || context.permissions.includes("crm.lead.read_all")) return { deletedAt: null, ...filter };
  return { deletedAt: null, ownerId: context.userId, ...filter };
}

function opportunityWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ opportunityName: { contains: query, mode: "insensitive" as const } }, { account: { name: { contains: query, mode: "insensitive" as const } } }] };
  if (isAdminContext(context) || context.permissions.includes("crm.opportunity.read_all")) return { deletedAt: null, ...filter };
  return { deletedAt: null, ownerId: context.userId, ...filter };
}

function quoteWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ quoteNumber: { contains: query, mode: "insensitive" as const } }, { title: { contains: query, mode: "insensitive" as const } }, { projectName: { contains: query, mode: "insensitive" as const } }] };
  if (isAdminContext(context) || context.permissions.includes("quotes.read_all")) return { deletedAt: null, ...filter };
  return { deletedAt: null, ownerId: context.userId, ...filter };
}

function presalesWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ requestNumber: { contains: query, mode: "insensitive" as const } }, { description: { contains: query, mode: "insensitive" as const } }, { account: { name: { contains: query, mode: "insensitive" as const } } }] };
  if (isAdminContext(context) || context.permissions.includes("presales.read_all")) return { deletedAt: null, ...filter };
  return { deletedAt: null, OR: [{ assignedToId: context.userId }, { requestedById: context.userId }, { opportunity: { ownerId: context.userId, deletedAt: null } }], AND: [filter] };
}

function projectWhere(context: CrmAccessContext, query: string) {
  return {
    AND: [
      projectVisibilityWhere(context),
      {
        OR: [
          { projectNumber: { contains: query, mode: "insensitive" as const } },
          { name: { contains: query, mode: "insensitive" as const } },
          { account: { name: { contains: query, mode: "insensitive" as const } } }
        ]
      }
    ]
  };
}

function resourceWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ displayName: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }, { companyName: { contains: query, mode: "insensitive" as const } }] };
  if (isAdminContext(context) || context.permissions.includes("field_services.read_all") || context.permissions.includes("field_services.manage_resources")) return { deletedAt: null, ...filter };
  return { deletedAt: null, userId: context.userId, ...filter };
}

function supplierWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }, { phone: { contains: query, mode: "insensitive" as const } }] };
  if (isAdminContext(context) || context.permissions.includes("procurement.read_all") || context.permissions.includes("procurement.create")) return { deletedAt: null, ...filter };
  return { deletedAt: null, account: { ownerId: context.userId, deletedAt: null }, ...filter };
}

function purchaseOrderWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ poNumber: { contains: query, mode: "insensitive" as const } }, { supplier: { name: { contains: query, mode: "insensitive" as const } } }] };
  if (isAdminContext(context) || context.permissions.includes("procurement.read_all") || context.permissions.includes("procurement.create") || context.permissions.includes("procurement.approve") || context.permissions.includes("procurement.finance")) return { deletedAt: null, ...filter };
  return { deletedAt: null, OR: [{ project: { projectManagerId: context.userId, deletedAt: null } }, { quote: { ownerId: context.userId, deletedAt: null } }], AND: [filter] };
}

function invoiceWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ invoiceNumber: { contains: query, mode: "insensitive" as const } }, { account: { name: { contains: query, mode: "insensitive" as const } } }] };
  if (isAdminContext(context) || context.permissions.includes("finance.read_all") || context.permissions.includes("finance.create_invoice") || context.permissions.includes("finance.record_payment")) return { deletedAt: null, ...filter };
  return { deletedAt: null, project: { projectManagerId: context.userId, deletedAt: null }, ...filter };
}

function assetWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ assetNumber: { contains: query, mode: "insensitive" as const } }, { serialNumber: { contains: query, mode: "insensitive" as const } }, { macAddress: { contains: query, mode: "insensitive" as const } }, { description: { contains: query, mode: "insensitive" as const } }] };
  if (isAdminContext(context) || context.permissions.includes("assets.read_all") || context.permissions.includes("assets.create") || context.permissions.includes("assets.update")) return { deletedAt: null, ...filter };
  return { deletedAt: null, OR: [{ project: { projectManagerId: context.userId, deletedAt: null } }, { account: { ownerId: context.userId, deletedAt: null } }], AND: [filter] };
}

function helpdeskWhere(context: CrmAccessContext, query: string) {
  const filter = { OR: [{ ticketNumber: { contains: query, mode: "insensitive" as const } }, { title: { contains: query, mode: "insensitive" as const } }, { raisedByEmail: { contains: query, mode: "insensitive" as const } }, { account: { name: { contains: query, mode: "insensitive" as const } } }] };
  if (isAdminContext(context) || context.permissions.includes("helpdesk.read_all") || context.permissions.includes("helpdesk.update")) return { deletedAt: null, ...filter };
  return { deletedAt: null, OR: [{ assignedToId: context.userId }, { raisedByUserId: context.userId }, { project: { projectManagerId: context.userId, deletedAt: null } }, { account: { ownerId: context.userId, deletedAt: null } }], AND: [filter] };
}
