import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { opportunityVisibilityWhere } from "@/modules/crm/crm-permissions";
import { quoteVisibilityWhere } from "@/modules/quoting/quotes/quote-permissions";
import { presalesVisibilityWhere } from "@/modules/presales/presales-permissions";
import { projectVisibilityWhere } from "@/modules/projects/project-permissions";
import { canManageDocumentRouting, type WorkspaceType } from "./document-routing";

export async function assertWorkspaceAccess(context: CrmAccessContext, type: WorkspaceType, id: string) {
  const record = type === "Opportunity" ? await prisma.opportunity.findFirst({ where: { AND: [opportunityVisibilityWhere(context), { id }] }, select: { id: true } })
    : type === "Quote" ? await prisma.quote.findFirst({ where: { AND: [quoteVisibilityWhere(context), { id }] }, select: { id: true } })
    : type === "PresalesRequest" ? await prisma.presalesRequest.findFirst({ where: { AND: [presalesVisibilityWhere(context), { id }] }, select: { id: true } })
    : await prisma.project.findFirst({ where: { AND: [projectVisibilityWhere(context), { id }] }, select: { id: true } });
  if (!record) throw new Error("Selected document record is unavailable or you do not have access.");
}

export async function ensureDocumentWorkspace(type: WorkspaceType, id: string) {
  const key = { entityType: type, entityId: id };
  const existing = await prisma.documentWorkspace.findUnique({ where: { entityType_entityId: key } });
  if (existing?.routeId) return existing;
  const parent = type === "Quote" ? await prisma.quote.findUnique({ where: { id }, select: { opportunityId: true } })
    : type === "PresalesRequest" ? await prisma.presalesRequest.findUnique({ where: { id }, select: { opportunityId: true } })
    : type === "Project" ? await prisma.project.findUnique({ where: { id }, select: { opportunityId: true } }) : null;
  const source = parent?.opportunityId ? await prisma.documentWorkspace.findUnique({ where: { entityType_entityId: { entityType: "Opportunity", entityId: parent.opportunityId } } }) : null;
  const workspace = await prisma.documentWorkspace.upsert({ where: { entityType_entityId: key },
    create: { ...key, routeId: source?.routeId, status: source?.routeId ? "pending" : "awaiting_mapping" },
    update: {}
  });
  // A concurrent staff mapping must take precedence over inherited routing.
  if (source?.routeId && !workspace.routeId) {
    await prisma.documentWorkspace.updateMany({ where: { id: workspace.id, routeId: null, folderId: null }, data: { routeId: source.routeId, status: "pending" } });
    return prisma.documentWorkspace.findUniqueOrThrow({ where: { id: workspace.id } });
  }
  return workspace;
}

export async function assignWorkspaceRoute(context: CrmAccessContext, type: WorkspaceType, id: string, routeId: string) {
  if (!canManageDocumentRouting(context)) throw new Error("Missing permission: document routing administration");
  await assertWorkspaceAccess(context, type, id);
  if (!await prisma.documentRoute.findFirst({ where: { id: routeId, active: true } })) throw new Error("Selected hotel mapping is unavailable.");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`workspace:${type}:${id}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`document-route:${routeId}`}))`;
    if (!await tx.documentRoute.findFirst({ where: { id: routeId, active: true } })) throw new Error("Selected hotel mapping is unavailable.");
    const key = { entityType: type, entityId: id };
    const existing = await tx.documentWorkspace.findUnique({ where: { entityType_entityId: key } });
    if (existing?.folderId) throw new Error("Unable to change routing after a folder has been created. Review the existing SharePoint location first.");
    const workspace = await tx.documentWorkspace.upsert({ where: { entityType_entityId: key }, create: { ...key, routeId, status: "pending" }, update: { routeId, status: "pending", lastError: null } });
    await tx.auditLog.create({ data: { userId: context.userId, module: "documents", entityType: type, entityId: id, action: "assign_document_route", newValue: { routeId } } });
    return workspace;
  });
}
