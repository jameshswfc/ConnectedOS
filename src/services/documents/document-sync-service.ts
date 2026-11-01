import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { GraphDocumentClient } from "./graph-document-client";
import { ensureDocumentWorkspace } from "./document-workspace-service";
import { resolveLocalDocumentPath } from "./local-document-path";
import { parentForWorkspace, shouldArchiveWorkspace, workspaceFolderName, workspaceType, type WorkspaceType } from "./document-routing";

// Reconciliation is deliberate: it also recovers records saved during a worker outage.
export async function discoverDocumentWorkspaces() {
  for (const type of ["Opportunity", "Quote", "PresalesRequest", "Project"] as const) {
    let cursor: string | undefined;
    for (;;) {
      const args = { where: { deletedAt: null }, select: { id: true }, orderBy: { id: "asc" as const }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) };
      const records = type === "Opportunity" ? await prisma.opportunity.findMany(args) : type === "Quote" ? await prisma.quote.findMany(args) : type === "PresalesRequest" ? await prisma.presalesRequest.findMany(args) : await prisma.project.findMany(args);
      for (const record of records) await ensureDocumentWorkspace(type, record.id);
      if (records.length < 100) break;
      cursor = records[records.length - 1].id;
    }
  }
}

export async function syncDocumentWorkspaces(suppliedClient?: GraphDocumentClient) {
  if (process.env.SHAREPOINT_ENABLED !== "true") return { enabled: false, synced: 0, failed: 0 };
  const client = suppliedClient ?? new GraphDocumentClient();
  await discoverDocumentWorkspaces();
  const rows = await prisma.documentWorkspace.findMany({ where: { routeId: { not: null }, route: { is: { active: true } }, archivedAt: null }, orderBy: { updatedAt: "asc" }, take: 100 });
  let synced = 0, failed = 0;
  for (const row of rows) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`workspace:${row.entityType}:${row.entityId}`}))`;
        const current = await tx.documentWorkspace.findUniqueOrThrow({ where: { id: row.id }, include: { route: true } });
        if (!current.routeId) return;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`document-route:${current.routeId}`}))`;
        const route = await tx.documentRoute.findUnique({ where: { id: current.routeId } });
        if (!route?.active || current.archivedAt) return;
        const type = workspaceType.parse(row.entityType);
        const record = type === "Project" ? await tx.project.findFirst({ where: { id: row.entityId, deletedAt: null }, select: { projectNumber: true, status: true } })
          : type === "Quote" ? await tx.quote.findFirst({ where: { id: row.entityId, deletedAt: null }, select: { quoteNumber: true } })
          : type === "PresalesRequest" ? await tx.presalesRequest.findFirst({ where: { id: row.entityId, deletedAt: null }, select: { requestNumber: true } })
          : await tx.opportunity.findFirst({ where: { id: row.entityId, deletedAt: null }, select: { opportunityName: true } });
        if (!record) {
          await tx.documentWorkspace.update({ where: { id: row.id }, data: { status: "record_unavailable", lastError: "The linked record is no longer available. Existing documents have been retained." } });
          return;
        }
        const reference = "projectNumber" in record ? record.projectNumber : "quoteNumber" in record ? record.quoteNumber : "requestNumber" in record ? record.requestNumber : "Opportunity";
        const parentId = parentForWorkspace(type, route);
        const folder = current.folderId ? await client.assertAllowedFolder(current.folderId) : await client.ensureFolder(parentId, workspaceFolderName(type, row.entityId, reference));
        const wantsArchive = shouldArchiveWorkspace(type, "status" in record ? record.status : "");
        // Persist the new folder identity first. A crash after a move must never cause recreation at the old parent.
        const archive = wantsArchive && Boolean(current.folderId);
        // Only folders created by this service are stored here. Legacy hotel containers are never adopted.
        const result = archive ? await client.archiveFolder(folder.id, parentId, route.completedParentId) : folder;
        if (archive) {
          const documents = await tx.document.findMany({ where: { entityType: type, entityId: row.entityId, sharepointItemId: { not: null }, deletedAt: null } });
          for (const document of documents) {
            const moved = await client.getItem(document.sharepointItemId!);
            await tx.document.update({ where: { id: document.id }, data: { webUrl: moved.webUrl } });
          }
        }
        await tx.documentWorkspace.update({ where: { id: row.id }, data: { folderId: result.id, webUrl: result.webUrl, status: archive ? "archived" : wantsArchive ? "pending_archive" : "ready", archivedAt: archive ? new Date() : null, lastError: null } });
        if (!current.folderId || archive) await tx.auditLog.create({ data: { module: "documents", entityType: type, entityId: row.entityId, action: archive ? "archive_completed_project_folder" : "provision_record_folder", newValue: { folderId: result.id, routeId: route.id } } });
      }, { timeout: 120000, maxWait: 10000 });
      synced++;
    } catch (error) {
      failed++;
      console.error("Document workspace sync failed", { workspaceId: row.id, error: error instanceof Error ? error.name : "UnknownError" });
      await prisma.documentWorkspace.update({ where: { id: row.id }, data: { status: "retry_required", lastError: "Folder sync could not finish. Check the approved SharePoint mapping and integration permissions, then retry." } });
    }
  }
  return { enabled: true, synced, failed };
}

export async function syncNewDocuments(client: GraphDocumentClient) {
  const since = process.env.SHAREPOINT_DOCUMENTS_SINCE;
  if (process.env.SHAREPOINT_ENABLED !== "true" || !since || Number.isNaN(Date.parse(since))) return { enabled: false, uploaded: 0, pending: 0, failed: 0 };
  const documents = await prisma.document.findMany({ where: { deletedAt: null, sharepointItemId: null, uploadedAt: { gte: new Date(since) }, entityType: { in: ["Opportunity", "Quote", "PresalesRequest", "Project"] } }, orderBy: { uploadedAt: "asc" }, take: 100 });
  let uploadedCount = 0, pending = 0, failed = 0;
  for (const document of documents) {
    if (!document.entityId || !document.entityType) continue;
    try {
      const workspace = await ensureDocumentWorkspace(document.entityType as WorkspaceType, document.entityId);
      if (!workspace.folderId || !["ready", "archived"].includes(workspace.status)) { pending++; continue; }
      const relative = document.storagePath ?? (document.entityType === "PresalesRequest" && document.externalId ? document.externalId : "");
      const absolute = await resolveLocalDocumentPath(relative);
      const buffer = await readFile(absolute);
      if (buffer.length > 25 * 1024 * 1024) throw new Error("File exceeds upload limit");
      const uploaded = await client.upload(workspace.folderId, `${document.id}-${document.fileName.replace(/["*:<>?\/\\|#%]/g, "_").slice(0, 120)}`, buffer);
      await prisma.$transaction(async (tx) => {
        await tx.document.update({ where: { id: document.id }, data: { sharepointItemId: uploaded.id, webUrl: uploaded.webUrl, sharepointSyncError: null } });
        await tx.auditLog.create({ data: { module: "documents", entityType: "Document", entityId: document.id, action: "copy_to_sharepoint", newValue: { itemId: uploaded.id, workspaceId: workspace.id } } });
      });
      uploadedCount++;
    } catch {
      failed++;
      await prisma.document.update({ where: { id: document.id }, data: { sharepointSyncError: "Upload pending retry. The local original has been retained." } });
    }
  }
  return { enabled: true, uploaded: uploadedCount, pending, failed };
}
