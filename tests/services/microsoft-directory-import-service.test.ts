import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  role: { upsert: vi.fn() }, auditLog: { create: vi.fn() }, transaction: vi.fn(), permission: vi.fn()
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/services/permissions/permission-service", () => ({ assertUserPermission: mocks.permission }));
import { importMicrosoftDirectory, planMicrosoftDirectoryImport } from "@/services/auth/microsoft-directory-import-service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const objectId = "22222222-2222-4222-8222-222222222222";
const entry = { objectId, email: "  MEMBER@connectedhsp.com ", displayName: "Member", userType: "Member", accountEnabled: true };
const snapshot = { tenantId, users: [entry] };
const local = { id: "local", email: "member@connectedhsp.com", microsoftId: null as string | null, isActive: true, deletedAt: null as Date | null, deactivatedAt: null as Date | null };
const identity = `${tenantId}:${objectId}`;

describe("administrator-reviewed Microsoft directory import", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("AZURE_AD_TENANT_ID", tenantId);
    mocks.transaction.mockImplementation((work) => work(mocks));
    mocks.user.findMany.mockResolvedValue([]);
    mocks.user.create.mockResolvedValue({ id: "new" });
    mocks.user.update.mockResolvedValue({ id: "local" });
    mocks.role.upsert.mockResolvedValue({ id: "staff", rolePermissions: [] });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("matches existing users case-insensitively without matching display names", () => {
    expect(planMicrosoftDirectoryImport(snapshot, [local], tenantId)[0]).toMatchObject({ action: "link", userId: "local", email: local.email });
    expect(planMicrosoftDirectoryImport(snapshot, [{ ...local, email: "other@connectedhsp.com" }], tenantId)[0].action).toBe("create");
  });
  it("retains an already linked legacy account despite a different local email", () => {
    expect(planMicrosoftDirectoryImport({ ...snapshot, users: [{ ...entry, userType: null }] }, [{ ...local, email: "alias@connectedhsp.com", microsoftId: identity }], tenantId)[0].action).toBe("unchanged");
  });
  it.each([{ accountEnabled: false }, { userType: "Guest" }, { userType: null }])("skips ineligible directory entries (%j)", (change) => {
    expect(planMicrosoftDirectoryImport({ ...snapshot, users: [{ ...entry, ...change }] }, [], tenantId)[0].action).toBe("skip");
  });
  it.each([{ isActive: false }, { deletedAt: new Date() }, { deactivatedAt: new Date() }])("never reactivates local accounts (%j)", (change) => {
    expect(planMicrosoftDirectoryImport(snapshot, [{ ...local, ...change }], tenantId)[0].action).toBe("skip");
  });
  it("rejects the wrong tenant and duplicate snapshot identities", () => {
    expect(() => planMicrosoftDirectoryImport(snapshot, [], objectId)).toThrow("tenant");
    expect(() => planMicrosoftDirectoryImport({ ...snapshot, users: [entry, entry] }, [], tenantId)).toThrow("Duplicate");
  });
  it("skips Microsoft's external guest UPN format without accepting invalid member emails", () => {
    const external = { ...entry, email: "guest_example.com#EXT#@tenant.onmicrosoft.com" };
    expect(planMicrosoftDirectoryImport({ ...snapshot, users: [{ ...external, userType: "Guest" }] }, [], tenantId)[0].action).toBe("skip");
    expect(() => planMicrosoftDirectoryImport({ ...snapshot, users: [external] }, [], tenantId)).toThrow("valid sign-in email");
  });
  it("flags duplicate local emails and conflicting identity ownership", () => {
    expect(planMicrosoftDirectoryImport(snapshot, [local, { ...local, id: "other" }], tenantId)[0].action).toBe("conflict");
    expect(planMicrosoftDirectoryImport(snapshot, [{ ...local, microsoftId: "different" }], tenantId)[0].action).toBe("conflict");
    expect(planMicrosoftDirectoryImport(snapshot, [local, { ...local, id: "other", email: "alias@connectedhsp.com", microsoftId: identity }], tenantId)[0].action).toBe("conflict");
  });
  it("defaults to preview with no writes", async () => {
    expect((await importMicrosoftDirectory("admin", snapshot))[0].action).toBe("create");
    expect(mocks.user.create).not.toHaveBeenCalled();
    expect(mocks.role.upsert).not.toHaveBeenCalled();
    expect(mocks.auditLog.create).not.toHaveBeenCalled();
  });
  it("requires administrator permission even for preview", async () => {
    mocks.permission.mockRejectedValue(new Error("Missing permission"));
    await expect(importMicrosoftDirectory("staff", snapshot, true)).rejects.toThrow("Missing permission");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("links without changing existing roles, passwords, email or ownership", async () => {
    mocks.user.findMany.mockResolvedValue([local]);
    await importMicrosoftDirectory("admin", snapshot, true);
    expect(mocks.user.update).toHaveBeenCalledWith({ where: { id: "local" }, data: { microsoftId: identity, updatedById: "admin" } });
    expect(mocks.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "admin", action: "link_microsoft_identity" }) });
    expect(mocks.role.upsert).not.toHaveBeenCalled();
  });
  it("creates passwordless Staff with basic permission level and an audit record", async () => {
    await importMicrosoftDirectory("admin", snapshot, true);
    expect(mocks.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ roleId: "staff", permissionLevel: "user", passwordHash: null, mustChangePassword: false, microsoftId: identity }) });
    expect(mocks.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "microsoft_directory_user_created" }) });
  });
  it("does not provision into a Staff role with elevated permissions", async () => {
    mocks.role.upsert.mockResolvedValue({ id: "staff", rolePermissions: [{}] });
    await expect(importMicrosoftDirectory("admin", snapshot, true)).rejects.toThrow("operational permissions");
    expect(mocks.user.create).not.toHaveBeenCalled();
  });
  it("fails the whole batch before any user writes if an identity conflicts", async () => {
    mocks.user.findMany.mockResolvedValue([{ ...local, microsoftId: "other" }]);
    await expect(importMicrosoftDirectory("admin", snapshot, true)).rejects.toThrow("No users were changed");
    expect(mocks.user.create).not.toHaveBeenCalled();
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
  it("reruns without duplicate users or audit entries", async () => {
    mocks.user.findMany.mockResolvedValue([{ ...local, microsoftId: identity }]);
    expect((await importMicrosoftDirectory("admin", snapshot, true))[0].action).toBe("unchanged");
    expect(mocks.user.create).not.toHaveBeenCalled();
    expect(mocks.user.update).not.toHaveBeenCalled();
    expect(mocks.auditLog.create).not.toHaveBeenCalled();
  });
});
