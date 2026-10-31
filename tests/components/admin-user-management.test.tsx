// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
import { AdminUserManagement } from "@/services/users/ui/admin-user-management";
const roles = [{ id: "sales", name: "Sales" }, { id: "pm", name: "Project Manager" }, { id: "admin", name: "Administrator" }, { id: "staff", name: "Staff" }];
const user = { id: "member", displayName: "Test Member", email: "member@example.invalid", roleId: "sales", role: roles[0], additionalRoles: [roles[1]], permissionLevel: "user" as const, isActive: false, mustChangePassword: false, lastLoginAt: null };
describe("admin roles and archive UI", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it("retains additional role selections without offering Administrator as an additional role", () => {
    render(<AdminUserManagement users={[user]} roles={roles} microsoftEnabled />);
    const form = screen.getByDisplayValue(user.email).closest("form")!;
    expect(new FormData(form).getAll("additionalRoleIds")).toEqual(["pm"]);
    expect(within(form).queryByRole("checkbox", { name: "Administrator", hidden: true })).toBeNull();
  });
  it("asks for confirmation and refreshes after a successful archive", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    render(<AdminUserManagement users={[user]} roles={roles} microsoftEnabled />);
    fireEvent.click(screen.getByRole("button", { name: "Archive User" }));
    expect(screen.getByRole("dialog", { name: "Archive Test Member" })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Archive" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith("/api/v1/users/member/archive", { method: "POST" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("does not offer archive for an active account", () => {
    render(<AdminUserManagement users={[{ ...user, isActive: true }]} roles={roles} microsoftEnabled />);
    expect(screen.queryByRole("button", { name: "Archive User" })).toBeNull();
  });
  it("renders last-login timestamps consistently in UK time on server and client", () => {
    render(<AdminUserManagement users={[{ ...user, lastLoginAt: "2026-06-22T20:22:41Z" }]} roles={roles} microsoftEnabled />);
    expect(screen.getByText(/22\/06\/2026, 21:22:41/)).toBeTruthy();
  });
});
