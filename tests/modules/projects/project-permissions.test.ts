import { describe, expect, it } from "vitest";
import { canReadAllProjects, projectVisibilityWhere } from "@/modules/projects/project-permissions";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

describe("project permissions", () => {
  const base: CrmAccessContext = { userId: "user-1", role: "Project Engineer", permissionLevel: "user", permissions: ["projects.read_assigned"] };

  it("gives Administrator and Business Operations read-all behaviour through permissions", () => {
    expect(canReadAllProjects({ ...base, role: "Administrator", permissionLevel: "administrator", permissions: [] })).toBe(true);
    expect(canReadAllProjects({ ...base, role: "Business Operations", permissions: ["projects.read_all"] })).toBe(true);
  });

  it("limits assigned users to PM, task, resource, sales quote/opportunity and presales links", () => {
    expect(projectVisibilityWhere(base)).toEqual({
      deletedAt: null,
      OR: [
        { projectManagerId: "user-1" },
        { tasks: { some: { deletedAt: null, OR: [{ assignedToId: "user-1" }, { ownerId: "user-1" }] } } },
        { resourceAssignments: { some: { deletedAt: null, userId: "user-1" } } },
        { opportunity: { ownerId: "user-1", deletedAt: null } },
        { quote: { ownerId: "user-1", deletedAt: null } },
        { presalesRequest: { OR: [{ requestedById: "user-1" }, { assignedToId: "user-1" }] } }
      ]
    });
  });
});
