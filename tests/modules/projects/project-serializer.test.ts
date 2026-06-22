import { describe, expect, it } from "vitest";
import { buildProjectResourceOptions, buildProjectUserOptions, serializeProject } from "@/modules/projects/project-serializer";

describe("project serializer", () => {
  it("serializes Decimal-like task values as numbers", () => {
    const project = serializeProject({
      id: "project-1",
      tasks: [
        {
          id: "task-1",
          estimatedDays: { toNumber: () => 2.5, toString: () => "2.5" },
          actualDays: { toNumber: () => 1, toString: () => "1" },
          startDate: new Date("2026-06-10T00:00:00.000Z"),
          endDate: new Date("2026-06-12T00:00:00.000Z"),
          predecessors: [
            {
              predecessorTaskId: "task-0",
              predecessorTask: {
                estimatedDays: { toNumber: () => 4, toString: () => "4" },
                actualDays: { toNumber: () => 2, toString: () => "2" }
              }
            }
          ]
        }
      ]
    });

    expect(project.tasks[0].estimatedDays).toBe(2.5);
    expect(project.tasks[0].actualDays).toBe(1);
    expect(project.tasks[0].predecessors[0].predecessorTask.estimatedDays).toBe(4);
    expect(project.tasks[0].predecessors[0].predecessorTask.actualDays).toBe(2);
    expect(project.tasks[0].startDate).toBe("2026-06-10T00:00:00.000Z");
  });

  it("does not leave Decimal objects in the serialized payload", () => {
    const serialized = serializeProject({
      resourceAssignments: [
        {
          scheduledDays: { toNumber: () => 5, toString: () => "5" },
          usedDays: { toNumber: () => 3, toString: () => "3" }
        }
      ]
    });

    expect(JSON.stringify(serialized)).not.toContain("toNumber");
    expect(serialized.resourceAssignments[0].scheduledDays).toBe(5);
    expect(serialized.resourceAssignments[0].usedDays).toBe(3);
  });

  it("builds stable user options even when display names duplicate", () => {
    const options = buildProjectUserOptions([
      { id: "user-1", displayName: "James Harrison", email: "james.one@example.com" },
      { id: "user-2", displayName: "James Harrison", email: "james.two@example.com" }
    ]);

    expect(options).toEqual([
      { id: "user-1", label: "James Harrison (james.one@example.com)" },
      { id: "user-2", label: "James Harrison (james.two@example.com)" }
    ]);
  });

  it("builds central resource options using secondary metadata when helpful", () => {
    const options = buildProjectResourceOptions([
      { id: "resource-1", displayName: "Alex Morgan", roleType: "Project Engineer", user: { email: "alex@example.com" } },
      { id: "resource-2", displayName: "Alex Morgan", companyName: "Partner Install Ltd", user: null }
    ]);

    expect(options).toEqual([
      { id: "resource-1", label: "Alex Morgan (Project Engineer)" },
      { id: "resource-2", label: "Alex Morgan (Partner Install Ltd)" }
    ]);
  });
});
