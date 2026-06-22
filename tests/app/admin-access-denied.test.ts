import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  userHasPermission: vi.fn(),
  listUsers: vi.fn(),
  listBusinessRoles: vi.fn(),
  listRoles: vi.fn(),
  listPermissions: vi.fn()
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: unknown }) => children
}));

vi.mock("@/services/auth/auth-service", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser
}));

vi.mock("@/services/permissions/permission-service", async () => {
  const actual = await vi.importActual<typeof import("@/services/permissions/permission-service")>("@/services/permissions/permission-service");
  return {
    ...actual,
    userHasPermission: mocks.userHasPermission
  };
});

vi.mock("@/services/users/user-service", async () => {
  const actual = await vi.importActual<typeof import("@/services/users/user-service")>("@/services/users/user-service");
  return {
    ...actual,
    listUsers: mocks.listUsers,
    listBusinessRoles: mocks.listBusinessRoles,
    listRoles: mocks.listRoles,
    listPermissions: mocks.listPermissions
  };
});

vi.mock("@/services/users/ui/admin-user-management", () => ({
  AdminUserManagement: () => null
}));

describe("admin page access denied handling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1", name: "Normal User" });
  });

  it("shows AccessDenied on /admin/users for an unauthorised user", async () => {
    mocks.userHasPermission.mockResolvedValue(false);
    const { default: UsersPage } = await import("@/app/admin/users/page");

    const page = await UsersPage();

    expect(pageText(page)).toContain("Access denied");
    expect(pageText(page)).toContain("You do not have permission to view this page.");
    expect(pageText(page)).toContain("Back to Dashboard");
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it("shows AccessDenied on /admin/roles for an unauthorised user", async () => {
    mocks.userHasPermission.mockResolvedValue(false);
    const { default: RolesPage } = await import("@/app/admin/roles/page");

    const page = await RolesPage();

    expect(pageText(page)).toContain("Access denied");
    expect(pageText(page)).toContain("You do not have permission to view this page.");
    expect(mocks.listRoles).not.toHaveBeenCalled();
  });

  it("shows AccessDenied on /admin/permissions for an unauthorised user", async () => {
    mocks.userHasPermission.mockResolvedValue(false);
    const { default: PermissionsPage } = await import("@/app/admin/permissions/page");

    const page = await PermissionsPage();

    expect(pageText(page)).toContain("Access denied");
    expect(pageText(page)).toContain("You do not have permission to view this page.");
    expect(mocks.listPermissions).not.toHaveBeenCalled();
  });

  it("loads admin pages normally for an authorised administrator", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "admin-1", name: "Admin User" });
    mocks.userHasPermission.mockResolvedValue(true);
    mocks.listUsers.mockResolvedValue([]);
    mocks.listBusinessRoles.mockResolvedValue([]);
    mocks.listRoles.mockResolvedValue([]);
    mocks.listPermissions.mockResolvedValue([]);

    const { default: UsersPage } = await import("@/app/admin/users/page");
    const { default: RolesPage } = await import("@/app/admin/roles/page");
    const { default: PermissionsPage } = await import("@/app/admin/permissions/page");

    expect(pageText(await UsersPage())).not.toContain("Access denied");
    expect(pageText(await RolesPage())).not.toContain("Access denied");
    expect(pageText(await PermissionsPage())).not.toContain("Access denied");
    expect(mocks.listUsers).toHaveBeenCalledOnce();
    expect(mocks.listBusinessRoles).toHaveBeenCalledOnce();
    expect(mocks.listRoles).toHaveBeenCalledOnce();
    expect(mocks.listPermissions).toHaveBeenCalledOnce();
  });
});

function pageText(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(pageText).join(" ");
  }

  if (typeof node === "object" && "props" in node && node.props && typeof node.props === "object") {
    if ("children" in node.props) {
      const childText = pageText(node.props.children);
      if (childText) {
        return childText;
      }
    }

    if ("type" in node && typeof node.type === "function") {
      return pageText(node.type(node.props));
    }
  }

  return "";
}
