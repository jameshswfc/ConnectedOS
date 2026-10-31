import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), permissions: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: mocks.findFirst }, permission: { findMany: mocks.permissions } } }));
import { authOptions } from "@/lib/auth";

async function refresh(token: JWT) {
  const callback = authOptions.callbacks!.jwt!;
  return callback({ token, account: null, user: undefined, profile: undefined } as unknown as Parameters<typeof callback>[0]);
}

describe("session access refresh", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.permissions.mockResolvedValue([{ code: "admin.users" }, { code: "crm.account.read_all" }]);
    mocks.findFirst.mockResolvedValue({ id: "member", displayName: "Member", email: "member@example.com", isActive: true, deletedAt: null, deactivatedAt: null, permissionLevel: "user", mustChangePassword: true, role: { name: "Staff", rolePermissions: [] } });
  });
  it("does not require a local password change for Microsoft sessions", async () => {
    expect(await refresh({ userId: "member", authProvider: "azure-ad" })).toMatchObject({ permissions: [], mustChangePassword: false, role: "Staff" });
  });
  it("preserves the existing first-login password gate for local users", async () => {
    expect(await refresh({ userId: "member", authProvider: "credentials" })).toMatchObject({ mustChangePassword: true });
  });
  it("does not identify an account from token email", async () => {
    expect(await refresh({ email: "admin@example.com", permissions: ["admin.users"] })).toMatchObject({ userId: undefined, permissions: [] });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
  it("revokes access immediately when the local account is deactivated", async () => {
    mocks.findFirst.mockResolvedValue({ id: "member", isActive: false });
    const token = await refresh({ userId: "member", permissions: ["admin.users"] });
    expect(token).toMatchObject({ userId: undefined, permissions: [] });
    const sessionCallback = authOptions.callbacks!.session!;
    const session = await sessionCallback({ token, session: { user: { name: "Former user" }, expires: "later" } } as Parameters<typeof sessionCallback>[0]);
    expect(session.user).toBeUndefined();
  });
  it("refreshes all assigned roles and combines their permissions", async () => {
    mocks.findFirst.mockResolvedValue({ id: "member", isActive: true, permissionLevel: "user", role: { name: "Sales", rolePermissions: [{ permission: { code: "crm.account.read_all" } }] }, userRoles: [{ role: { name: "Project Manager", rolePermissions: [{ permission: { code: "projects.manage_tasks" } }] } }] });
    expect(await refresh({ userId: "member", authProvider: "azure-ad" })).toMatchObject({ roles: ["Sales", "Project Manager"], permissions: ["crm.account.read_all", "projects.manage_tasks"] });
  });
  it("clears stale combined roles when an account is archived", async () => {
    mocks.findFirst.mockResolvedValue({ id: "member", isActive: true, deletedAt: new Date() });
    expect(await refresh({ userId: "member", roles: ["Administrator"], permissions: ["admin.users"] })).toMatchObject({ userId: undefined, roles: [], permissions: [] });
  });
});
