import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  invitation: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn() }, submission: { create: vi.fn() }, user: { findMany: vi.fn() }, notification: { createMany: vi.fn() }, audit: { create: vi.fn() }, execute: vi.fn(), transaction: vi.fn(), email: vi.fn(), quarantine: vi.fn(), remove: vi.fn()
}));
vi.mock("@/lib/prisma", () => ({ prisma: { presalesInvitation: mocks.invitation, partnerSubmission: mocks.submission, user: mocks.user, notification: mocks.notification, auditLog: mocks.audit, $executeRaw: mocks.execute, $transaction: mocks.transaction } }));
vi.mock("@/services/email/email-service", () => ({ sendTemplatedEmail: mocks.email }));
vi.mock("@/modules/presales/partner-intake-storage", () => ({ INTAKE_MAX_FILES: 5, quarantineFile: mocks.quarantine, removeQuarantinedFile: mocks.remove }));
import { getPartnerFormContext, intakeRecipients, submitPartnerRequest } from "@/modules/presales/partner-intake-service";

const details = { requesterName: "Partner Contact", requesterEmail: "contact@example.test", requesterPhone: "", company: "Partner", hotelName: "Hotel", brand: "Hilton", location: "Cambridge", address: "Hotel address", propertyCode: "", rooms: 100, floors: 3, scope: "Guest WiFi design", systems: "WiFi", existingEquipment: "", constraints: "", requestedDate: "", consent: true };
const invitation = { id: "invite", partner: "Verified partner", route: { ...details, active: true }, expiresAt: new Date("2099-01-01"), revokedAt: null, submission: null };
describe("private partner intake", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv("PARTNER_INTAKE_ENABLED", "true"); vi.stubEnv("PARTNER_INTAKE_NOTIFY_USER_IDS", "james,tim,stephen");
    mocks.invitation.findUnique.mockResolvedValue(invitation); mocks.invitation.findUniqueOrThrow.mockResolvedValue(invitation);
    mocks.user.findMany.mockResolvedValue(["james", "tim", "stephen"].map((id) => ({ id, email: `${id}@example.test` })));
    mocks.transaction.mockImplementation((fn) => fn({ presalesInvitation: mocks.invitation, partnerSubmission: mocks.submission, notification: mocks.notification, auditLog: mocks.audit, $executeRaw: mocks.execute }));
    mocks.submission.create.mockResolvedValue({ id: "receipt" });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("returns hotel prefill without exposing internal account or route data", async () => {
    const result = await getPartnerFormContext("a".repeat(43));
    expect(result.prefill.partner).toBe("Verified partner");
    expect(Object.keys(result.prefill)).toEqual(["hotelName", "brand", "location", "address", "propertyCode", "partner"]);
  });
  it("creates a durable submission and three in-app notifications even when email fails", async () => {
    mocks.email.mockRejectedValue(new Error("offline"));
    expect(await submitPartnerRequest("a".repeat(43), details, [])).toEqual({ receipt: "receipt" });
    expect(mocks.notification.createMany.mock.calls[0][0].data.map((row: { userId: string }) => row.userId)).toEqual(["james", "tim", "stephen"]);
    expect(mocks.notification.createMany.mock.calls[0][0].data[0].metadata.href).toBe("/presales/intake/receipt");
    expect(mocks.audit.create).toHaveBeenCalledOnce(); expect(mocks.email).toHaveBeenCalledTimes(3);
  });
  it("returns the existing receipt on resubmission without duplicating records or notifications", async () => {
    mocks.invitation.findUnique.mockResolvedValue({ ...invitation, submission: { id: "existing" } });
    expect(await submitPartnerRequest("a".repeat(43), details, [])).toEqual({ receipt: "existing" });
    expect(mocks.submission.create).not.toHaveBeenCalled(); expect(mocks.notification.createMany).not.toHaveBeenCalled();
  });
  it("rechecks the invitation under a database lock to prevent concurrent duplicate submissions", async () => {
    mocks.invitation.findUniqueOrThrow.mockResolvedValue({ ...invitation, submission: { id: "concurrent" } });
    expect(await submitPartnerRequest("a".repeat(43), details, [])).toEqual({ receipt: "concurrent" });
    expect(mocks.execute).toHaveBeenCalled(); expect(mocks.submission.create).not.toHaveBeenCalled();
  });
  it("requires configured active identities, not fuzzy name matches or a guessed recipient", async () => {
    mocks.user.findMany.mockResolvedValue([{ id: "james" }]);
    await expect(intakeRecipients()).rejects.toThrow("administrator review");
    vi.stubEnv("PARTNER_INTAKE_NOTIFY_USER_IDS", "");
    await expect(intakeRecipients()).rejects.toThrow("James, Tim and Stephen");
  });
  it("rejects external attempts to inject routing fields", async () => {
    await expect(submitPartnerRequest("a".repeat(43), { ...details, routeId: "somewhere-else" }, [])).rejects.toThrow();
    expect(mocks.submission.create).not.toHaveBeenCalled();
  });
  it("cleans up quarantined files after a database failure", async () => {
    mocks.quarantine.mockResolvedValue({ storageKey: "file", fileName: "plan.pdf", sizeBytes: 6, sha256: "hash" });
    mocks.transaction.mockRejectedValue(new Error("database offline"));
    await expect(submitPartnerRequest("a".repeat(43), details, [{ name: "plan.pdf", buffer: Buffer.from("%PDF-1") }])).rejects.toThrow("database offline");
    expect(mocks.remove).toHaveBeenCalledWith("file");
  });
  it("fails closed when intake is disabled", async () => {
    vi.stubEnv("PARTNER_INTAKE_ENABLED", "false");
    await expect(getPartnerFormContext("a".repeat(43))).rejects.toThrow("not available");
    expect(mocks.invitation.findUnique).not.toHaveBeenCalled();
  });
});
