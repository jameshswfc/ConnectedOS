import { PermissionLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { adminIssuedPasswordRequiresChange, businessRoleNames, completedPasswordChangeRequiresChange, permissionCodesForLevel, standardUserPermissionCodes } from "@/services/users/user-service";

describe("user service permission levels", () => {
  it("grants administrators every available permission", () => {
    expect(permissionCodesForLevel(PermissionLevel.administrator, ["notifications.read"], ["admin.users", "crm.account.read_all"])).toEqual([
      "admin.users",
      "crm.account.read_all"
    ]);
  });

  it("uses role permissions only for standard users", () => {
    const permissions = permissionCodesForLevel(PermissionLevel.user, ["notifications.read"], ["admin.users"]);

    expect(permissions).toEqual(["notifications.read"]);
    expect(permissions).not.toContain("admin.users");
  });

  it("does not grant user management to the standard user permission level", () => {
    expect(standardUserPermissionCodes()).not.toContain("admin.users");
  });

  it("marks admin-issued passwords for first-login change and clears the flag after user password change", () => {
    expect(adminIssuedPasswordRequiresChange).toBe(true);
    expect(completedPasswordChangeRequiresChange).toBe(false);
  });

  it("exposes only the approved roles for normal admin assignment", () => {
    expect([...businessRoleNames]).toEqual([
      "Administrator",
      "Sales",
      "Pre-Sales",
      "Project Engineer",
      "Project Manager",
      "Field Engineer",
      "Finance",
      "Business Operations"
    ]);
    expect([...businessRoleNames]).not.toContain("System Administrator");
    expect([...businessRoleNames]).not.toContain("Sales User");
    expect([...businessRoleNames]).not.toContain("Pre-Sales Engineer");
  });
});
