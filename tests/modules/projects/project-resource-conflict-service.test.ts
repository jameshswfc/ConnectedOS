import { beforeEach, describe, expect, it, vi } from "vitest";
import { detectResourceConflicts } from "@/modules/projects/project-resource-conflict-service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectResourceAssignment: {
      findMany: vi.fn()
    }
  }
}));

describe("project resource conflict service", () => {
  beforeEach(() => {
    vi.mocked(prisma.projectResourceAssignment.findMany).mockReset();
  });

  it("returns overlapping active assignments as conflicts", async () => {
    vi.mocked(prisma.projectResourceAssignment.findMany).mockResolvedValueOnce([
      {
        id: "assignment-1",
        projectId: "project-1",
        startDate: new Date("2026-06-08"),
        endDate: new Date("2026-06-10"),
        role: "field_engineer",
        scheduledDays: 3,
        project: { projectNumber: "PRJ-2026-0001", name: "Hotel WiFi" }
      }
    ] as never);

    await expect(detectResourceConflicts("resource-1", new Date("2026-06-09"), new Date("2026-06-11"), "project-2", "user-1")).resolves.toEqual([
      {
        assignmentId: "assignment-1",
        projectId: "project-1",
        projectNumber: "PRJ-2026-0001",
        projectName: "Hotel WiFi",
        startDate: new Date("2026-06-08"),
        endDate: new Date("2026-06-10"),
        role: "field_engineer",
        scheduledDays: 3,
        conflictType: "project_assignment"
      }
    ]);
    expect(prisma.projectResourceAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [{ resourceId: "resource-1" }, { userId: "user-1" }],
        project: expect.objectContaining({ id: { not: "project-2" } })
      })
    }));
  });

  it("returns no conflicts for non-overlapping assignments", async () => {
    vi.mocked(prisma.projectResourceAssignment.findMany).mockResolvedValueOnce([]);
    await expect(detectResourceConflicts("resource-1", new Date("2026-06-20"), new Date("2026-06-21"))).resolves.toEqual([]);
  });
});
