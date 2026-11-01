import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";
import { canManagePartnerIntake, canViewPartnerIntake } from "@/services/documents/document-routing";
import { invitationAvailable, invitationTokenSchema, partnerPrefill, partnerSubmissionSchema } from "./partner-intake-schemas";
import { INTAKE_MAX_FILES, quarantineFile, removeQuarantinedFile } from "./partner-intake-storage";
import { sendTemplatedEmail } from "@/services/email/email-service";

export function assertPartnerIntakeAccess(context: CrmAccessContext) {
  if (!canManagePartnerIntake(context)) throw new Error("Missing permission: pre-sales intake management");
}
export function assertPartnerIntakeReadAccess(context: CrmAccessContext) {
  if (!canViewPartnerIntake(context)) throw new Error("Missing permission: pre-sales intake viewing");
}
export function hashInvitationToken(token: string) { return createHash("sha256").update(invitationTokenSchema.parse(token)).digest("hex"); }
export async function limitInvitationRequests(token: string) {
  const hash = hashInvitationToken(token);
  const accepted = await prisma.$executeRaw`UPDATE presales_invitations SET "requestCount" = CASE WHEN "requestWindowAt" < NOW() - INTERVAL '10 minutes' THEN 1 ELSE "requestCount" + 1 END, "requestWindowAt" = CASE WHEN "requestWindowAt" < NOW() - INTERVAL '10 minutes' THEN NOW() ELSE "requestWindowAt" END WHERE "tokenHash" = ${hash} AND ("requestCount" < 30 OR "requestWindowAt" < NOW() - INTERVAL '10 minutes')`;
  if (!accepted) throw new Error("This invitation is unavailable or has reached its request limit. Please try again in ten minutes.");
}
export async function getPartnerInvitation(token: string) {
  if (process.env.PARTNER_INTAKE_ENABLED !== "true") throw new Error("Partner submissions are not available yet.");
  const invitation = await prisma.presalesInvitation.findUnique({ where: { tokenHash: hashInvitationToken(token) }, include: { route: true, submission: { select: { id: true } } } });
  if (!invitation || !invitationAvailable(invitation) || !invitation.route.active) throw new Error("This invitation is unavailable or has expired. Please request a new link from Connected Hospitality.");
  return invitation;
}
export async function getPartnerFormContext(token: string) {
  const invitation = await getPartnerInvitation(token);
  return { prefill: partnerPrefill(invitation.route, invitation.partner), receipt: invitation.submission?.id ?? null };
}
export async function createPartnerInvitation(context: CrmAccessContext, routeId: string, partner: string) {
  assertPartnerIntakeAccess(context);
  if (!await prisma.documentRoute.findFirst({ where: { id: routeId, active: true } })) throw new Error("Selected hotel mapping is unavailable.");
  const token = randomBytes(32).toString("base64url");
  const invitation = await prisma.$transaction(async (tx) => {
    const created = await tx.presalesInvitation.create({ data: { routeId, partner, tokenHash: hashInvitationToken(token), createdById: context.userId, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    await tx.auditLog.create({ data: { userId: context.userId, module: "presales", entityType: "PresalesInvitation", entityId: created.id, action: "create_invitation", newValue: { routeId, expiresAt: created.expiresAt.toISOString() } } });
    return created;
  });
  // Fragment tokens are not transmitted in access logs, referrer headers or server-rendered pages.
  return { id: invitation.id, path: `/submit/presales#${token}`, expiresAt: invitation.expiresAt };
}

export async function intakeRecipients() {
  const ids = process.env.PARTNER_INTAKE_NOTIFY_USER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
  if (ids.length !== 3 || new Set(ids).size !== 3) throw new Error("Partner intake notification recipients must be configured for James, Tim and Stephen before accepting submissions.");
  const users = await prisma.user.findMany({ where: { id: { in: ids }, isActive: true, deletedAt: null, deactivatedAt: null }, select: { id: true, email: true } });
  if (users.length !== 3) throw new Error("Partner intake notification recipients need administrator review.");
  return users;
}

export async function submitPartnerRequest(token: string, raw: unknown, files: { name: string; buffer: Buffer }[]) {
  const invitation = await getPartnerInvitation(token);
  if (invitation.submission) return { receipt: invitation.submission.id };
  const details = partnerSubmissionSchema.parse(raw);
  if (files.length > INTAKE_MAX_FILES || files.reduce((sum, file) => sum + file.buffer.length, 0) > 10 * 1024 * 1024) throw new Error("Attach up to five files, totalling no more than 10 MB.");
  const recipients = await intakeRecipients();
  const saved: Awaited<ReturnType<typeof quarantineFile>>[] = [];
  let committed = false;
  try {
    for (const file of files) saved.push(await quarantineFile(file.name, file.buffer));
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`intake:${invitation.id}`}))`;
      const latest = await tx.presalesInvitation.findUniqueOrThrow({ where: { id: invitation.id }, include: { submission: true } });
      if (!invitationAvailable(latest)) throw new Error("This invitation has expired or been revoked.");
      if (latest.submission) return { receipt: latest.submission.id, created: false };
      const submission = await tx.partnerSubmission.create({ data: { invitationId: invitation.id, details, attachments: { create: saved } } });
      await tx.notification.createMany({ data: recipients.map((user) => ({ userId: user.id, title: "Partner pre-sales submission received", body: `A new submission from ${invitation.partner} is ready for review.`, metadata: { href: `/presales/intake/${submission.id}`, entityType: "PartnerSubmission", entityId: submission.id } })) });
      await tx.auditLog.create({ data: { module: "presales", entityType: "PartnerSubmission", entityId: submission.id, action: "receive_partner_submission", newValue: { invitationId: invitation.id, attachmentCount: saved.length } } });
      return { receipt: submission.id, created: true };
    });
    committed = result.created;
    if (result.created) {
      for (const user of recipients) {
        try { await sendTemplatedEmail({ to: user.email, title: "Partner pre-sales submission received", summary: "A new partner submission is ready for review in ConnectedOS.", actionLabel: "Review submission", actionHref: `${process.env.NEXTAUTH_URL ?? ""}/presales/intake/${result.receipt}` }); }
        catch { console.warn("Partner intake email unavailable", { submissionId: result.receipt, userId: user.id }); }
      }
    }
    return { receipt: result.receipt };
  } finally {
    if (!committed) for (const file of saved) await removeQuarantinedFile(file.storageKey);
  }
}
