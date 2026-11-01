import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: { lead: { findMany: vi.fn() }, opportunity: { findMany: vi.fn() }, presalesRequest: { findMany: vi.fn() }, quote: { findMany: vi.fn() }, projectTask: { findMany: vi.fn() }, salesActivity: { findMany: vi.fn() } } }));
import { prisma } from "@/lib/prisma";
import { getWorkQueue, prioritiseWork, type WorkItem } from "@/modules/work/work-queue-service";

const item = (id: string, due: string | null, blocked = false): WorkItem => ({ id, due, blocked, area: "tasks", title: id, customer: "Hotel", owner: "Engineer", status: "open", href: "/projects/id#tasks", nextAction: "Update task" });
describe("cross-module work queue", () => {
  beforeEach(() => vi.clearAllMocks());
  it("prioritises blockers and overdue work, then today and missing dates", () => {
    expect(prioritiseWork([item("later", "2026-11-05"), item("today", "2026-11-01"), item("no-date", null), item("overdue", "2026-10-01"), item("blocked", null, true)], "all", new Date("2026-11-01")).map((r) => r.id)).toEqual(["blocked", "overdue", "today", "no-date", "later"]);
  });
  it("does not query modules without read permission", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([]);
    await getWorkQueue({ userId: "sales", permissions: ["crm.lead.read_own"], role: "Sales" });
    expect(prisma.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([{ ownerId: "sales" }]) }) }));
    expect(prisma.quote.findMany).not.toHaveBeenCalled(); expect(prisma.projectTask.findMany).not.toHaveBeenCalled(); expect(prisma.presalesRequest.findMany).not.toHaveBeenCalled();
  });
  it("rejects Staff without business access", async () => { await expect(getWorkQueue({ userId: "staff", permissions: [] })).rejects.toThrow("Missing permission"); });
});
