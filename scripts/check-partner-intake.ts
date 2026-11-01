import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { PrismaClient, PresalesRequestCategory, PresalesRequestType } from "@prisma/client";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Run this check only against a local database.");
  const browser = process.argv.includes("--browser");
  const schema = `intake_check_${randomUUID().replaceAll("-", "")}`;
  const adminDb = new PrismaClient();
  let created = false;
  let disconnect: (() => Promise<void>) | undefined;
  let cleanupFiles: (() => Promise<void>) | undefined;
  let server: ChildProcess | undefined;
  try {
    await adminDb.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    url.searchParams.set("schema", schema);
    process.env.DATABASE_URL = url.toString();
    process.env.EMAIL_PROVIDER = "disabled";
    process.env.SHAREPOINT_ENABLED = "false";
    process.env.SHAREPOINT_CAPTURE_EXPORTS = "false";
    process.env.SAGE_ENABLED = "false";
    process.env.SAGE_ALLOW_INVOICE_CREATE = "false";
    process.env.PARTNER_INTAKE_ENABLED = "true";
    process.env.PARTNER_INTAKE_SCANNER_PATH = "";
    process.env.ENABLE_ENTRA_LOGIN = "false";
    process.env.NEXTAUTH_URL = "http://localhost:3012";
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env: process.env, stdio: "pipe" });
    const { prisma } = await import("../src/lib/prisma");
    disconnect = () => prisma.$disconnect();
    const { removeQuarantinedFile } = await import("../src/modules/presales/partner-intake-storage");
    cleanupFiles = async () => {
      for (const file of await prisma.partnerAttachment.findMany()) await removeQuarantinedFile(file.storageKey);
    };
    const { createPartnerInvitation, getPartnerFormContext, submitPartnerRequest } = await import("../src/modules/presales/partner-intake-service");
    const { createPresalesRequest } = await import("../src/modules/presales/presales-service");
    const { presalesRequestCreateSchema } = await import("../src/modules/presales/schemas/presales-schemas");
    const { canViewPartnerIntake, canManagePartnerIntake } = await import("../src/services/documents/document-routing");
    const role = await prisma.role.create({ data: { name: "Isolated intake test, no sign-in" } });
    const recipients = [];
    for (const name of ["James", "Tim", "Stephen"]) {
      recipients.push(await prisma.user.create({ data: { roleId: role.id, displayName: `Test recipient ${name}`, email: `${name.toLowerCase()}@example.invalid` } }));
    }
    process.env.PARTNER_INTAKE_NOTIFY_USER_IDS = recipients.map((user) => user.id).join(",");
    const context = { userId: recipients[0].id, permissionLevel: "administrator" as const, permissions: [] };
    for (const user of recipients) {
      assert.equal(canViewPartnerIntake({ userId: user.id, permissions: ["presales.create"] }), true);
      assert.equal(canManagePartnerIntake({ userId: user.id, permissions: ["presales.create"] }), false);
    }
    const route = await prisma.documentRoute.create({ data: {
      hotelName: "Test Hotel", propertyCode: "XTEST", brand: "Tempo by Hilton", location: "UK", partner: "Reivernet",
      address: "", salesParentId: "", presalesParentId: "", projectsParentId: "", completedParentId: ""
    } });
    const invitation = await createPartnerInvitation(context, route.id, "Reivernet");
    const token = invitation.path.split("#")[1];
    assert.deepEqual((await getPartnerFormContext(token)).prefill, {
      hotelName: "Test Hotel", propertyCode: "XTEST", brand: "Tempo by Hilton", location: "UK", address: "", partner: "Reivernet"
    });
    const details = {
      requesterName: "Internal QA", requesterEmail: "qa@example.invalid", requesterPhone: "", company: "Reivernet",
      hotelName: "Test Hotel", propertyCode: "XTEST", brand: "Tempo by Hilton", location: "UK", address: "Internal test only; no real hotel address",
      rooms: null, floors: null, scope: "XTEST internal validation of document intake", systems: "WiFi", existingEquipment: "", constraints: "Internal test only", requestedDate: "", consent: true
    };
    if (browser) {
      server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "-p", "3012"], { env: process.env, stdio: ["ignore", "inherit", "inherit"] });
      console.log(`LOCAL TEST ONLY (no external delivery): http://localhost:3012${invitation.path}`);
      const deadline = Date.now() + 10 * 60 * 1000;
      while (!await prisma.partnerSubmission.count()) {
        if (server.exitCode !== null) throw new Error("Preview server stopped before submission.");
        if (Date.now() > deadline) throw new Error("Browser check timed out without a submission.");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } else {
      await submitPartnerRequest(token, details, [{ name: "xtest-scope.txt", buffer: Buffer.from("XTEST internal test attachment. No customer data.") }]);
    }
    const submission = await prisma.partnerSubmission.findFirstOrThrow();
    assert.equal((await submitPartnerRequest(token, details, [])).receipt, submission.id);
    assert.equal(await prisma.partnerSubmission.count(), 1);
    const notifications = await prisma.notification.findMany();
    assert.deepEqual(notifications.map((row) => row.userId).sort(), recipients.map((user) => user.id).sort());
    for (const row of notifications) assert.equal((row.metadata as { href: string }).href, `/presales/intake/${submission.id}`);
    assert.equal(await prisma.auditLog.count({ where: { action: "receive_partner_submission" } }), 1);
    const attachments = await prisma.partnerAttachment.findMany();
    assert.equal(attachments.length, 1, "The test must include one attachment");
    for (const file of attachments) assert.equal(file.scanStatus, "quarantined");
    const account = await prisma.account.create({ data: { name: "XTEST isolated test account", ownerId: context.userId } });
    const input = presalesRequestCreateSchema.parse({ accountId: account.id, requestCategory: Object.values(PresalesRequestCategory)[0], requestType: Object.values(PresalesRequestType)[0], internalDeadline: new Date(Date.now() + 86400000 * 7), description: "XTEST reviewed partner submission" });
    const request = await createPresalesRequest(context, input, { partnerSubmissionId: submission.id });
    const retry = await createPresalesRequest(context, input, { partnerSubmissionId: submission.id });
    assert.equal(retry.id, request.id);
    assert.equal(await prisma.presalesRequest.count(), 1);
    const workspace = await prisma.documentWorkspace.findUniqueOrThrow({ where: { entityType_entityId: { entityType: "PresalesRequest", entityId: request.id } } });
    assert.equal(workspace.routeId, route.id);
    assert.equal(workspace.status, "pending");
    assert.equal(await prisma.auditLog.count({ where: { action: "convert_to_presales" } }), 1);
    await prisma.presalesInvitation.update({ where: { id: invitation.id }, data: { revokedAt: new Date() } });
    await assert.rejects(getPartnerFormContext(token), /unavailable/);
    console.log("PASS: XTEST hotel/brand/UK/Reivernet prefill; one durable submission; exactly three notifications; quarantine; reviewed request and workspace mapping; duplicate protection; revocation. No SharePoint, Sage or external email calls.");
    if (browser) await new Promise((resolve) => setTimeout(resolve, 15000));
  } finally {
    if (server && server.exitCode === null) { const stopped = once(server, "exit"); server.kill("SIGTERM"); await stopped; }
    await cleanupFiles?.();
    await disconnect?.();
    if (created) await adminDb.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await adminDb.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error("Intake check failed", { type: error instanceof Error ? error.name : "UnknownError", message: error instanceof assert.AssertionError ? error.message : "Review the isolated test. Provider details withheld." });
  process.exitCode = 1;
});
