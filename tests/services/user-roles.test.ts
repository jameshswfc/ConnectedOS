import { describe, expect, it } from "vitest";
import { assignedRoleNames, combinedRolePermissions, hasRole, usersWithRoles } from "@/services/permissions/user-roles";
import { filterActiveSalesUsers } from "@/modules/crm/sales/salesperson-service";
import { visibleNavigationItems } from "@/components/navigation/navigation-items";

const role = (name: string, codes: string[]) => ({ name, rolePermissions: codes.map((code) => ({ permission: { code } })) });

describe("combined business roles", () => {
  it("unions permissions and role names without duplicates", () => {
    const user = { role: role("Sales", ["crm.account.read_all"]), userRoles: [{ role: role("Project Manager", ["crm.account.read_all", "projects.manage_tasks"]) }] };
    expect(assignedRoleNames(user)).toEqual(["Sales", "Project Manager"]);
    expect(combinedRolePermissions(user)).toEqual(["crm.account.read_all", "projects.manage_tasks"]);
    expect(hasRole({ role: "Sales", roles: assignedRoleNames(user) }, "Project Manager")).toBe(true);
  });
  it("never derives administration from combinations of non-admin roles", () => {
    expect(combinedRolePermissions({ role: role("Business Operations", ["admin.users", "projects.read_all"]), userRoles: [{ role: role("Finance", ["admin.roles", "finance.read"]) }] })).toEqual(["projects.read_all", "finance.read"]);
    expect(combinedRolePermissions({ role: role("Administrator", ["admin.users"]) })).toContain("admin.users");
  });
  it("shows navigation for both Sales and Project Manager without admin menus", () => {
    const labels = visibleNavigationItems([], "user", ["Sales", "Project Manager"]).map((item) => item.label);
    expect(labels).toEqual(expect.arrayContaining(["CRM Pipeline", "Projects", "Field Services", "Settings"]));
    expect(labels).not.toContain("Users");
    expect(labels).not.toContain("Roles");
  });
  it("includes additional Sales roles but excludes inactive and archived users", () => {
    const user = { id: "one", displayName: "Combined role", email: "one@example.invalid", isActive: true, role: { name: "Project Manager" }, userRoles: [{ role: { name: "Sales" } }] };
    expect(filterActiveSalesUsers([user, { ...user, id: "two", isActive: false }, { ...user, id: "three", deletedAt: new Date() }]).map((item) => item.id)).toEqual(["one"]);
    expect(usersWithRoles(["Project Manager"])).toHaveProperty("OR.1.userRoles.some.role.name.in", ["Project Manager"]);
  });
});
