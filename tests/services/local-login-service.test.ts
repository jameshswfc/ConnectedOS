import { describe, expect, it } from "vitest";
import { evaluateLocalLogin, normalizeLoginEmail } from "@/services/auth/local-login-service";
import { hashPassword } from "@/services/auth/password-service";

const activeDate = new Date("2026-06-09T10:00:00.000Z");

async function buildUser(overrides: Partial<Parameters<typeof evaluateLocalLogin>[1] extends (email: string) => Promise<infer T> ? NonNullable<T> : never> = {}) {
  return {
    id: "user-1",
    displayName: "James Harrison",
    email: "me@jrharrison.com",
    passwordHash: await hashPassword("ConnectedOS2026"),
    isActive: true,
    deletedAt: null,
    deactivatedAt: null,
    createdAt: activeDate,
    updatedAt: activeDate,
    roleId: "role-1",
    microsoftId: null,
    userType: "internal",
    jobTitle: null,
    phone: null,
    permissionLevel: "administrator",
    mustChangePassword: false,
    lastLoginAt: null,
    createdById: null,
    updatedById: null,
    ...overrides
  };
}

describe("local login service", () => {
  it("normalizes email case and whitespace", () => {
    expect(normalizeLoginEmail(" ME@JRHARRISON.COM ")).toBe("me@jrharrison.com");
  });

  it("logs in with the seeded admin password", async () => {
    const user = await buildUser();
    const result = await evaluateLocalLogin(
      { email: " ME@JRHARRISON.COM ", password: "ConnectedOS2026" },
      async (email) => email === "me@jrharrison.com" ? [user] : []
    );

    expect(result).toEqual({
      status: "success",
      user: {
        id: "user-1",
        name: "James Harrison",
        email: "me@jrharrison.com"
      }
    });
  });

  it("fails with the wrong password", async () => {
    const user = await buildUser();
    const result = await evaluateLocalLogin(
      { email: "me@jrharrison.com", password: "WrongConnected2026" },
      async () => [user]
    );

    expect(result).toEqual({ status: "invalid" });
  });

  it("blocks inactive and deactivated users", async () => {
    const inactiveUser = await buildUser({ isActive: false });
    const deactivatedUser = await buildUser({ deactivatedAt: activeDate });

    await expect(evaluateLocalLogin({ email: "me@jrharrison.com", password: "ConnectedOS2026" }, async () => [inactiveUser])).resolves.toEqual({ status: "inactive" });
    await expect(evaluateLocalLogin({ email: "me@jrharrison.com", password: "ConnectedOS2026" }, async () => [deactivatedUser])).resolves.toEqual({ status: "inactive" });
  });

  it("rejects duplicate case-insensitive user records", async () => {
    const firstUser = await buildUser({ id: "user-1", email: "james@connectedhsp.com" });
    const secondUser = await buildUser({ id: "user-2", email: "JAMES@connectedhsp.com" });

    await expect(evaluateLocalLogin({ email: "james@connectedhsp.com", password: "ConnectedOS2026" }, async () => [firstUser, secondUser])).resolves.toEqual({ status: "duplicate" });
  });
});
