import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail, sendTemplatedEmail } from "@/services/email/email-service";

describe("email service", () => {
  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    vi.restoreAllMocks();
  });

  it("uses the console provider by default", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await sendEmail({
      to: "tester@example.com",
      subject: "ConnectedOS test",
      html: "<p>Hello</p>"
    });

    expect(result).toEqual({ sent: true, provider: "console" });
    expect(spy).toHaveBeenCalled();
  });

  it("fails safely when smtp is selected without configuration", async () => {
    process.env.EMAIL_PROVIDER = "smtp";
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await sendEmail({
      to: "tester@example.com",
      subject: "ConnectedOS test",
      html: "<p>Hello</p>"
    });

    expect(result.sent).toBe(false);
    expect(result.provider).toBe("smtp");
    expect(result.error).toContain("not configured");
    expect(spy).toHaveBeenCalled();
  });

  it("renders branded template emails", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await sendTemplatedEmail({
      to: "tester@example.com",
      title: "Quote approved",
      summary: "Q-2026-0007 is approved.",
      details: [{ label: "Quote", value: "Q-2026-0007" }],
      actionLabel: "Open quote",
      actionHref: "/quotes/quote-1"
    });

    expect(result.sent).toBe(true);
    expect(spy).toHaveBeenCalledWith(
      "[email] console provider",
      expect.objectContaining({
        subject: "Quote approved"
      })
    );
  });
});
