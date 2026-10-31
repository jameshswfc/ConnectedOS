// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn }));
import { LoginActions } from "@/app/login/login-actions";

describe("Microsoft sign-in presentation", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);
  it("keeps local login available when Microsoft is not configured", () => {
    render(<LoginActions showDevelopmentLogin={false} />);
    expect(screen.queryByRole("button", { name: "Sign in with Microsoft 365" })).toBeNull();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
  });
  it("uses the configured provider and current port; restores the button after a network failure", async () => {
    signIn.mockRejectedValue(new Error("offline"));
    render(<LoginActions showDevelopmentLogin={false} microsoftEnabled />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Microsoft 365" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Unable to start Microsoft sign-in"));
    expect(signIn).toHaveBeenCalledWith("azure-ad", { callbackUrl: `${window.location.origin}/dashboard` });
    expect((screen.getByRole("button", { name: "Sign in with Microsoft 365" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("Local account sign-in")).toBeTruthy();
  });
  it("does not render raw provider errors", () => {
    render(<LoginActions showDevelopmentLogin={false} loginError="sensitive-internal-error" />);
    expect(screen.queryByText("sensitive-internal-error")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Unable to sign in");
  });
  it("gives a useful existing-account linking message", () => {
    render(<LoginActions showDevelopmentLogin={false} loginError="MicrosoftAccountLinkRequired" />);
    expect(screen.getByRole("alert").textContent).toContain("administrator needs to link");
  });
});
