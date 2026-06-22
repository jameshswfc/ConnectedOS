import { describe, expect, it } from "vitest";
import { canAssignPresales, presalesVisibilityWhere } from "@/modules/presales/presales-permissions";

describe("pre-sales permissions", () => {
  it("allows read_all users to see all pre-sales requests", () => {
    expect(presalesVisibilityWhere({ userId: "manager", permissions: ["presales.read_all"] })).toEqual({ deletedAt: null });
  });

  it("scopes assigned/read users to requested, assigned or owned CRM records", () => {
    expect(presalesVisibilityWhere({ userId: "engineer-1", permissions: ["presales.read_assigned"] })).toEqual({
      deletedAt: null,
      OR: [
        { requestedById: "engineer-1" },
        { assignedToId: "engineer-1" },
        { account: { ownerId: "engineer-1", deletedAt: null } },
        { opportunity: { ownerId: "engineer-1", deletedAt: null } }
      ]
    });
  });

  it("recognises assignment rights", () => {
    expect(canAssignPresales({ userId: "sales-manager", permissions: ["presales.assign"] })).toBe(true);
    expect(canAssignPresales({ userId: "engineer", permissions: ["presales.update"] })).toBe(false);
  });
});

