import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), audit: vi.fn(), assertPermission: vi.fn() }));
vi.mock("@/services/permissions/permission-service", () => ({ assertUserPermission: mocks.assertPermission }));
vi.mock("@/lib/prisma", () => {
  const tx = { user: { findUnique: mocks.findUnique, update: mocks.update, findMany: mocks.findMany }, auditLog: { create: mocks.audit } };
  return { prisma: { ...tx, $transaction: (run: (client: typeof tx) => unknown) => run(tx) } };
});
import { archiveUser, listUsers } from "@/services/users/user-service";
import { handleUserApiError } from "@/services/users/user-api-utils";

describe("archiving deactivated users", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findUnique.mockResolvedValue({ id: "former", isActive: false, deletedAt: null, microsoftId: "tenant:immutable-id", role: { name: "Staff" }, userRoles: [] });
    mocks.findMany.mockResolvedValue([]);
  });
  it("soft-archives, audits and preserves identity/history fields", async () => {
    await expect(archiveUser("admin", "former")).resolves.toEqual({ id: "former", archived: true });
    expect(mocks.assertPermission).toHaveBeenCalledWith("admin", "admin.users");
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "former" }, data: { deletedAt: expect.any(Date), deletedById: "admin", updatedById: "admin" } });
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "archive_user", entityId: "former" }) });
  });
  it("excludes archived users even from the inactive user list", async () => {
    await listUsers(true);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deletedAt: null } }));
  });
  it("is idempotent", async () => {
    mocks.findUnique.mockResolvedValue({ id: "former", isActive: false, deletedAt: new Date() });
    await archiveUser("admin", "former");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects active accounts and returns a friendly 400", async () => {
    mocks.findUnique.mockResolvedValue({ id: "active", isActive: true });
    const response = await archiveUser("admin", "active").catch(handleUserApiError);
    expect(response).toHaveProperty("status", 400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("cannot archive oneself", async () => {
    await expect(archiveUser("admin", "admin")).rejects.toThrow("own account");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects non-admin callers before reading or writing data", async () => {
    mocks.assertPermission.mockRejectedValue(new Error("Missing permission: admin.users"));
    const response = await archiveUser("ordinary", "former").catch(handleUserApiError);
    expect(response).toHaveProperty("status", 403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
