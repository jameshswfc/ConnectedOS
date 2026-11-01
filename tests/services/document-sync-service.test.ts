import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  workspace: { findMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  project: { findMany: vi.fn(), findFirst: vi.fn() }, records: { findMany: vi.fn() },
  route: { findUnique: vi.fn() }, documents: { findMany: vi.fn(), update: vi.fn() },
  audit: { create: vi.fn() }, lock: vi.fn(), transaction: vi.fn(), ensure: vi.fn()
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  documentWorkspace: mocks.workspace, project: mocks.project,
  quote: mocks.records, opportunity: mocks.records, presalesRequest: mocks.records,
  documentRoute: mocks.route, document: mocks.documents, auditLog: mocks.audit,
  $executeRaw: mocks.lock, $transaction: mocks.transaction
} }));
vi.mock("@/services/documents/document-workspace-service", () => ({ ensureDocumentWorkspace: mocks.ensure }));
import { syncDocumentWorkspaces } from "@/services/documents/document-sync-service";
import type { GraphDocumentClient } from "@/services/documents/graph-document-client";

const route = { id: "route", active: true, projectsParentId: "hotel", completedParentId: "completed" };
const workspace = { id: "workspace", entityType: "Project", entityId: "project", routeId: "route", folderId: null, archivedAt: null };
function client() {
  return { ensureFolder: vi.fn().mockResolvedValue({ id: "child", webUrl: "https://example.sharepoint.com/child" }),
    assertAllowedFolder: vi.fn().mockResolvedValue({ id: "child" }),
    archiveFolder: vi.fn().mockResolvedValue({ id: "child", webUrl: "https://example.sharepoint.com/completed/child" }), getItem: vi.fn() };
}
describe("document workspace reconciliation", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv("SHAREPOINT_ENABLED", "true");
    mocks.project.findMany.mockResolvedValue([]); mocks.records.findMany.mockResolvedValue([]);
    mocks.project.findFirst.mockResolvedValue({ projectNumber: "PRJ-2026-0001", status: "active" });
    mocks.workspace.findMany.mockResolvedValue([workspace]); mocks.workspace.findUniqueOrThrow.mockResolvedValue(workspace);
    mocks.route.findUnique.mockResolvedValue(route); mocks.documents.findMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation((fn) => fn({ documentWorkspace: mocks.workspace, documentRoute: mocks.route, project: mocks.project, document: mocks.documents, auditLog: mocks.audit, $executeRaw: mocks.lock }));
  });
  afterEach(() => vi.unstubAllEnvs());
  it("does no remote work while disabled", async () => {
    vi.stubEnv("SHAREPOINT_ENABLED", "false"); const graph = client();
    expect(await syncDocumentWorkspaces(graph as unknown as GraphDocumentClient)).toEqual({ enabled: false, synced: 0, failed: 0 });
    expect(mocks.workspace.findMany).not.toHaveBeenCalled(); expect(graph.ensureFolder).not.toHaveBeenCalled();
  });
  it("creates a per-record child and records its stable identity", async () => {
    const graph = client(); await syncDocumentWorkspaces(graph as unknown as GraphDocumentClient);
    expect(graph.ensureFolder).toHaveBeenCalledWith("hotel", expect.stringContaining("project"));
    expect(mocks.workspace.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ folderId: "child", status: "ready" }) }));
    expect(mocks.audit.create).toHaveBeenCalledOnce(); expect(mocks.lock).toHaveBeenCalledTimes(2);
  });
  it("persists a newly created folder before attempting archival on a later pass", async () => {
    mocks.project.findFirst.mockResolvedValue({ projectNumber: "PRJ-2026-0001", status: "closed" });
    const graph = client(); await syncDocumentWorkspaces(graph as unknown as GraphDocumentClient);
    expect(graph.archiveFolder).not.toHaveBeenCalled();
    expect(mocks.workspace.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ folderId: "child", status: "pending_archive", archivedAt: null }) }));
  });
  it("archives only the stored project child when formally closed", async () => {
    mocks.workspace.findUniqueOrThrow.mockResolvedValue({ ...workspace, folderId: "child" });
    mocks.project.findFirst.mockResolvedValue({ projectNumber: "PRJ-2026-0001", status: "closed" });
    const graph = client(); await syncDocumentWorkspaces(graph as unknown as GraphDocumentClient);
    expect(graph.ensureFolder).not.toHaveBeenCalled(); expect(graph.archiveFolder).toHaveBeenCalledWith("child", "hotel", "completed");
    expect(mocks.workspace.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "archived", archivedAt: expect.any(Date) }) }));
  });
  it("does not archive when tasks only auto-complete the project", async () => {
    mocks.workspace.findUniqueOrThrow.mockResolvedValue({ ...workspace, folderId: "child" });
    mocks.project.findFirst.mockResolvedValue({ projectNumber: "PRJ-2026-0001", status: "completed" });
    const graph = client(); await syncDocumentWorkspaces(graph as unknown as GraphDocumentClient);
    expect(graph.archiveFolder).not.toHaveBeenCalled();
  });
  it("retains the known folder identity after a failed move for safe retry", async () => {
    mocks.workspace.findUniqueOrThrow.mockResolvedValue({ ...workspace, folderId: "child" });
    mocks.project.findFirst.mockResolvedValue({ projectNumber: "PRJ-2026-0001", status: "closed" });
    const graph = client(); graph.archiveFolder.mockRejectedValue(new Error("offline"));
    expect(await syncDocumentWorkspaces(graph as unknown as GraphDocumentClient)).toMatchObject({ failed: 1 });
    const data = mocks.workspace.update.mock.calls[0][0].data;
    expect(data.status).toBe("retry_required"); expect(data).not.toHaveProperty("folderId"); expect(data).not.toHaveProperty("archivedAt");
  });
  it("rechecks an inactive mapping under the route lock", async () => {
    mocks.route.findUnique.mockResolvedValue({ ...route, active: false }); const graph = client();
    await syncDocumentWorkspaces(graph as unknown as GraphDocumentClient);
    expect(graph.ensureFolder).not.toHaveBeenCalled(); expect(graph.archiveFolder).not.toHaveBeenCalled();
  });
});
