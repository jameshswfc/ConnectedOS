import { prisma } from "@/lib/prisma";

type EmailProvider = "console" | "smtp" | "disabled";

export type EmailSendInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type EmailTemplateInput = {
  to: string | string[];
  title: string;
  summary: string;
  details?: Array<{ label: string; value: string | null | undefined }>;
  actionLabel?: string;
  actionHref?: string;
  footer?: string;
};

export type EmailSendResult = {
  sent: boolean;
  provider: EmailProvider;
  error?: string;
};

function configuredProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER ?? "console").trim().toLowerCase();
  if (provider === "smtp") return "smtp";
  if (provider === "disabled") return "disabled";
  return "console";
}

function fromAddress() {
  return process.env.EMAIL_FROM?.trim() || "ConnectedOS noreply@connectedhsp.com";
}

function normalizeRecipients(input: string | string[]) {
  return (Array.isArray(input) ? input : [input])
    .map((value) => value.trim())
    .filter(Boolean);
}

function textBody(input: EmailSendInput) {
  if (input.text?.trim()) return input.text.trim();
  return input.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const recipients = normalizeRecipients(input.to);
  if (!recipients.length) {
    return { sent: false, provider: configuredProvider(), error: "No recipients supplied" };
  }

  const provider = configuredProvider();
  try {
    if (provider === "disabled") {
      return { sent: false, provider };
    }

    if (provider === "smtp") {
      const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
      if (!smtpConfigured) {
        console.warn("[email] SMTP provider selected but not configured", { to: recipients, subject: input.subject });
        return { sent: false, provider, error: "SMTP provider not configured" };
      }
      console.info("[email] SMTP provider deferred", {
        from: fromAddress(),
        to: recipients,
        subject: input.subject
      });
      return { sent: false, provider, error: "SMTP sending is not configured in this environment yet" };
    }

    console.info("[email] console provider", {
      from: fromAddress(),
      to: recipients,
      subject: input.subject,
      text: textBody(input)
    });
    return { sent: true, provider };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email] send failure", {
      provider,
      to: recipients,
      subject: input.subject,
      message
    });
    return { sent: false, provider, error: message };
  }
}

export async function sendTemplatedEmail(input: EmailTemplateInput) {
  const footer = input.footer ?? "Connected Hospitality";
  const details = (input.details ?? []).filter((detail) => detail.value && detail.value.trim());
  const html = [
    "<div style=\"font-family:Calibri,Arial,sans-serif;background:#faf7fc;color:#1e293b;padding:24px;\">",
    "<div style=\"max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;\">",
    "<div style=\"padding:20px 24px;border-bottom:4px solid #D4AF37;background:#5B3F8C;color:#ffffff;\">",
    `<h1 style="margin:0;font-size:22px;line-height:1.2;">${escapeHtml(input.title)}</h1>`,
    "</div>",
    "<div style=\"padding:24px;\">",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#1e293b;">${escapeHtml(input.summary)}</p>`,
    details.length
      ? [
          "<table style=\"width:100%;border-collapse:collapse;margin:0 0 20px;\">",
          ...details.map((detail) => (
            `<tr><td style="padding:8px 10px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600;width:34%;">${escapeHtml(detail.label)}</td><td style="padding:8px 10px;border:1px solid #cbd5e1;">${escapeHtml(detail.value ?? "")}</td></tr>`
          )),
          "</table>"
        ].join("")
      : "",
    input.actionHref && input.actionLabel
      ? `<p style="margin:0 0 20px;"><a href="${escapeHtml(input.actionHref)}" style="display:inline-block;background:#5B3F8C;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">${escapeHtml(input.actionLabel)}</a></p>`
      : "",
    `<p style="margin:0;font-size:12px;color:#64748b;">${escapeHtml(footer)}</p>`,
    "</div></div></div>"
  ].join("");

  const text = [
    input.title,
    input.summary,
    ...details.map((detail) => `${detail.label}: ${detail.value}`),
    input.actionHref && input.actionLabel ? `${input.actionLabel}: ${input.actionHref}` : null,
    footer
  ].filter(Boolean).join("\n");

  return sendEmail({
    to: input.to,
    subject: input.title,
    html,
    text
  });
}

export async function sendTemplatedEmailToUserIds(
  userIds: Iterable<string>,
  buildTemplate: (user: { id: string; displayName: string; email: string }) => Omit<EmailTemplateInput, "to"> | null
) {
  const uniqueIds = [...new Set([...userIds].filter(Boolean))];
  if (!uniqueIds.length) return [];
  const users = await prisma.user.findMany({
    where: {
      id: { in: uniqueIds },
      isActive: true,
      deletedAt: null,
      deactivatedAt: null
    },
    select: {
      id: true,
      displayName: true,
      email: true
    }
  });

  const sends = users
    .map((user) => {
      if (!user.email) return null;
      const template = buildTemplate({ id: user.id, displayName: user.displayName, email: user.email });
      if (!template) return null;
      return sendTemplatedEmail({ ...template, to: user.email });
    })
    .filter(Boolean);

  return Promise.all(sends);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
