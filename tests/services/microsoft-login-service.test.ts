import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  role: { upsert: vi.fn() }, auditLog: { create: vi.fn() }, notification: { createMany: vi.fn() }, transaction: vi.fn(), permission: vi.fn()
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/services/permissions/permission-service", () => ({ assertUserPermission: mocks.permission }));

import { isMicrosoftLoginEnabled, microsoftIdentity, signInMicrosoftUser } from "@/services/auth/microsoft-login-service";
import { linkMicrosoftAccount } from "@/services/auth/microsoft-account-link-service";

const tenant = "11111111-1111-4111-8111-111111111111";
const objectId = "22222222-2222-4222-8222-222222222222";
const claims = { tid: tenant, oid: objectId, acct: 0, name: "New Staff Member", preferred_username: "  STAFF@connectedhsp.com " };
const activeUser = { id: "existing-user", displayName: "Existing Member", isActive: true, deletedAt: null, deactivatedAt: null, microsoftId: `${tenant}:${objectId}`, roleId: "existing-role", permissionLevel: "user" };

describe("Microsoft tenant-member onboarding", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("AZURE_AD_TENANT_ID", tenant);
    mocks.transaction.mockImplementation((work) => work(mocks));
    mocks.role.upsert.mockResolvedValue({ id: "staff-role" });
    mocks.user.findMany.mockResolvedValue([{ id: "admin" }]);
    mocks.user.create.mockImplementation(({ data }) => ({ ...data, id: "new-user" }));
    mocks.user.update.mockImplementation(({ where }) => ({ ...activeUser, id: where.id }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("requires explicit complete configuration before exposing the provider", () => {
    vi.stubEnv("ENABLE_ENTRA_LOGIN", "false");
    expect(isMicrosoftLoginEnabled()).toBe(false);
    vi.stubEnv("ENABLE_ENTRA_LOGIN", "true");
    vi.stubEnv("AZURE_AD_CLIENT_ID", "client");
    vi.stubEnv("AZURE_AD_CLIENT_SECRET", "test-only-secret");
    expect(isMicrosoftLoginEnabled()).toBe(true);
    vi.stubEnv("AZURE_AD_TENANT_ID", "common");
    expect(isMicrosoftLoginEnabled()).toBe(false);
  });

  it("normalises email but binds identity to tenant and object ID", () => {
    expect(microsoftIdentity(claims)).toEqual({ microsoftId: `${tenant}:${objectId}`, email: "staff@connectedhsp.com", displayName: claims.name });
  });

  it.each([null, { ...claims, tid: objectId }, { ...claims, tid: 4 }])("rejects another or malformed tenant", (profile) => {
    expect(() => microsoftIdentity(profile)).toThrow("MicrosoftTenantRequired");
  });
  it.each([1, "1", undefined])("denies guests or missing member claim (%s)", (acct) => {
    expect(() => microsoftIdentity({ ...claims, acct })).toThrow("MicrosoftMemberRequired");
  });

  it("creates a password-free Staff user with no operational access and alerts administrators", async () => {
    await signInMicrosoftUser(claims);
    expect(mocks.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ roleId: "staff-role", permissionLevel: "user", passwordHash: null, mustChangePassword: false }) });
    expect(mocks.role.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.not.objectContaining({ rolePermissions: expect.anything() }) }));
    expect(mocks.notification.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ userId: "admin", metadata: { href: "/admin/users" } })] });
    expect(mocks.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "microsoft_user_provisioned" }) }));
  });

  it("does not change existing linked roles or ownership on subsequent sign-in", async () => {
    mocks.user.findUnique.mockResolvedValue(activeUser);
    await signInMicrosoftUser(claims);
    expect(mocks.user.create).not.toHaveBeenCalled();
    expect(mocks.role.upsert).not.toHaveBeenCalled();
    expect(mocks.user.update).toHaveBeenCalledWith({ where: { id: activeUser.id }, data: { lastLoginAt: expect.any(Date) } });
  });

  it("never claims an existing privileged account merely by email", async () => {
    mocks.user.findFirst.mockResolvedValue(activeUser);
    await expect(signInMicrosoftUser(claims)).rejects.toThrow("MicrosoftAccountLinkRequired");
    expect(mocks.user.create).not.toHaveBeenCalled();
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it.each([{ isActive: false }, { deletedAt: new Date() }, { deactivatedAt: new Date() }])("blocks inactive/deleted accounts", async (changes) => {
    mocks.user.findUnique.mockResolvedValue({ ...activeUser, ...changes });
    await expect(signInMicrosoftUser(claims)).rejects.toThrow("MicrosoftAccountInactive");
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it("links an existing user without changing role, password or record ownership", async () => {
    mocks.user.findFirst.mockResolvedValue({ ...activeUser, microsoftId: null });
    await expect(linkMicrosoftAccount("admin", activeUser.id, objectId)).resolves.toEqual({ id: activeUser.id, microsoftId: `${tenant}:${objectId}` });
    expect(mocks.permission).toHaveBeenCalledWith("admin", "admin.users");
    expect(mocks.user.update).toHaveBeenCalledWith({ where: { id: activeUser.id }, data: { microsoftId: `${tenant}:${objectId}`, updatedById: "admin" } });
    expect(mocks.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "link_microsoft_identity" }) }));
  });

  it("rejects identity linking without administrator permission", async () => {
    mocks.permission.mockRejectedValue(new Error("Missing permission: admin.users"));
    await expect(linkMicrosoftAccount("staff", activeUser.id, objectId)).rejects.toThrow("Missing permission");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not allow linking one Microsoft identity to two local users", async () => {
    mocks.user.findFirst.mockResolvedValue({ ...activeUser, microsoftId: null });
    mocks.user.findUnique.mockResolvedValue({ id: "someone-else" });
    await expect(linkMicrosoftAccount("admin", activeUser.id, objectId)).rejects.toThrow("already linked");
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
});
