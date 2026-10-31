import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {}
}));

describe("auth service password-change gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps page redirects but returns a typed authentication error for APIs", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const { requireAuthenticatedUser, requireAuthenticatedApiUser } = await import("@/services/auth/auth-service");
    await expect(requireAuthenticatedUser()).rejects.toThrow("REDIRECT:/login");
    mocks.redirect.mockClear();
    await expect(requireAuthenticatedApiUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("blocks API access until the password is changed but permits the password-change endpoint", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1", mustChangePassword: true, permissions: [] } });
    const { requireAuthenticatedApiUser } = await import("@/services/auth/auth-service");
    await expect(requireAuthenticatedApiUser()).rejects.toMatchObject({ code: "PASSWORD_CHANGE_REQUIRED", status: 403 });
    await expect(requireAuthenticatedApiUser({ allowPasswordChangeRequired: true })).resolves.toMatchObject({ id: "user-1" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("preserves authenticated role and permission context", async () => {
    const user = { id: "user-1", role: "Sales", permissionLevel: "user", permissions: ["crm.account.read_own"] };
    mocks.getServerSession.mockResolvedValue({ user });
    const { requireAuthenticatedApiUser } = await import("@/services/auth/auth-service");
    await expect(requireAuthenticatedApiUser()).resolves.toEqual(user);
  });

  it("redirects a must-change-password user away from protected pages", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        name: "User One",
        mustChangePassword: true,
        permissions: []
      }
    });
    const { requireAuthenticatedUser } = await import("@/services/auth/auth-service");

    await expect(requireAuthenticatedUser()).rejects.toThrow("REDIRECT:/settings/change-password");
  });

  it("allows a must-change-password user onto the change-password flow", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        name: "User One",
        mustChangePassword: true,
        permissions: []
      }
    });
    const { requireAuthenticatedUser } = await import("@/services/auth/auth-service");

    await expect(requireAuthenticatedUser({ allowPasswordChangeRequired: true })).resolves.toMatchObject({
      id: "user-1",
      mustChangePassword: true
    });
  });
});
