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
