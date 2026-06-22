import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/services/auth/password-service";
import { developmentInitialAdminPassword, resolveInitialAdminPassword } from "@/services/users/initial-admin-seed";

describe("initial admin seed password", () => {
  it("creates an admin password when no existing hash is present", async () => {
    const decision = resolveInitialAdminPassword({ existingPasswordHash: null, envPassword: null });

    expect(decision).toEqual({
      password: developmentInitialAdminPassword,
      shouldSetPassword: true,
      mustChangePassword: true
    });

    const passwordHash = await hashPassword(decision.password ?? "");
    await expect(verifyPassword(developmentInitialAdminPassword, passwordHash)).resolves.toBe(true);
  });

  it("updates an existing admin password when INITIAL_ADMIN_PASSWORD is set", async () => {
    const existingPasswordHash = await hashPassword("OldConnected123");
    const decision = resolveInitialAdminPassword({
      existingPasswordHash,
      envPassword: " ConnectedOS2026 "
    });

    expect(decision).toEqual({
      password: "ConnectedOS2026",
      shouldSetPassword: true,
      mustChangePassword: false
    });

    const passwordHash = await hashPassword(decision.password ?? "");
    await expect(verifyPassword("ConnectedOS2026", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("OldConnected123", passwordHash)).resolves.toBe(false);
  });

  it("does not reset an existing admin password when INITIAL_ADMIN_PASSWORD is missing", async () => {
    const decision = resolveInitialAdminPassword({
      existingPasswordHash: "existing-hash",
      envPassword: ""
    });

    expect(decision).toEqual({
      password: null,
      shouldSetPassword: false,
      mustChangePassword: false
    });
  });
});
