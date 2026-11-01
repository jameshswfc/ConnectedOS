import { afterEach, describe, expect, it, vi } from "vitest";
import { canManageDocumentRouting, canManagePartnerIntake, canViewPartnerIntake, documentRouteSchema, parentForWorkspace, shouldArchiveWorkspace, workspaceFolderName } from "@/services/documents/document-routing";
import { invitationAvailable, partnerPrefill, partnerSubmissionSchema } from "@/modules/presales/partner-intake-schemas";
import { hashInvitationToken } from "@/modules/presales/partner-intake-service";
import { validateIntakeFile, limitedRequestBody } from "@/modules/presales/partner-intake-storage";

describe("document routing and private intake boundaries", () => {
  const normal = { userId: "user", permissions: [] };
  afterEach(() => vi.unstubAllEnvs());
  it("lets the three configured recipients read intake without granting management rights", () => {
    vi.stubEnv("PARTNER_INTAKE_NOTIFY_USER_IDS", "james,tim,stephen");
    for (const userId of ["james", "tim", "stephen"]) {
      const context = { userId, permissions: ["presales.create"] };
      expect(canViewPartnerIntake(context)).toBe(true);
      expect(canManagePartnerIntake(context)).toBe(false);
      expect(canManageDocumentRouting(context)).toBe(false);
    }
    expect(canViewPartnerIntake({ userId: "someone-else", permissions: ["presales.create"] })).toBe(false);
    expect(canViewPartnerIntake({ userId: "stephen", permissions: [] })).toBe(false);
  });
  it("fails closed for absent or invalid recipient configuration", () => {
    const context = { userId: "stephen", permissions: ["presales.create"] };
    for (const setting of ["", "stephen", "james,stephen,stephen", "james,tim,stephen,other"]) {
      vi.stubEnv("PARTNER_INTAKE_NOTIFY_USER_IDS", setting);
      expect(canViewPartnerIntake(context)).toBe(false);
    }
    expect(canViewPartnerIntake({ ...context, permissionLevel: "administrator" })).toBe(true);
  });
  it("limits mapping administration and intake triage separately", () => {
    expect(canManageDocumentRouting(normal)).toBe(false);
    expect(canManageDocumentRouting({ ...normal, permissions: ["admin.users"] })).toBe(true);
    expect(canManagePartnerIntake({ ...normal, permissions: ["presales.create"] })).toBe(false);
    expect(canManagePartnerIntake({ ...normal, permissions: ["presales.create", "presales.assign"] })).toBe(true);
  });
  it("uses module-specific parents, never guesses brand or location", () => {
    const route = { salesParentId: "sales", presalesParentId: "pre", projectsParentId: "deployment" };
    expect(parentForWorkspace("Opportunity", route)).toBe("sales");
    expect(parentForWorkspace("Quote", route)).toBe("sales");
    expect(parentForWorkspace("PresalesRequest", route)).toBe("pre");
    expect(parentForWorkspace("Project", route)).toBe("deployment");
    expect(documentRouteSchema.safeParse({ hotelName: "Hotel" }).success).toBe(false);
  });
  it("archives closed projects, not task-completed projects or other record types", () => {
    expect(shouldArchiveWorkspace("Project", "closed")).toBe(true);
    expect(shouldArchiveWorkspace("Project", "completed")).toBe(false);
    expect(shouldArchiveWorkspace("Opportunity", "closed")).toBe(false);
  });
  it("uses a stable per-record folder, never the whole hotel container", () => {
    expect(workspaceFolderName("Project", "record-id", "PRJ/2026")).toBe("PRJ_2026 - Project record-id");
  });
  it("exposes only hotel prefill and invitation partner, not mapping IDs", () => {
    const prefill = partnerPrefill({ hotelName: "Hotel", brand: "Brand", location: "UK", address: "Address", propertyCode: null }, "Partner");
    expect(prefill).toEqual({ hotelName: "Hotel", brand: "Brand", location: "UK", address: "Address", propertyCode: "", partner: "Partner" });
  });
  it("rejects expired and revoked invitation links", () => {
    expect(invitationAvailable({ expiresAt: new Date(0), revokedAt: null })).toBe(false);
    expect(invitationAvailable({ expiresAt: new Date("2099-01-01"), revokedAt: new Date() })).toBe(false);
    expect(invitationAvailable({ expiresAt: new Date("2099-01-01"), revokedAt: null })).toBe(true);
  });
  it("stores irreversible hashes rather than bearer invitation links", () => {
    const token = "a".repeat(43);
    expect(hashInvitationToken(token)).toHaveLength(64);
    expect(hashInvitationToken(token)).not.toContain(token);
    expect(() => hashInvitationToken("guess")).toThrow();
  });
  it("rejects externally supplied routing IDs and consent omissions", () => {
    expect(partnerSubmissionSchema.safeParse({ routeId: "foreign", consent: false }).success).toBe(false);
  });
  it("validates file signatures and rejects macros and disguised content", () => {
    expect(() => validateIntakeFile("plan.pdf", Buffer.from("%PDF-1.7\nbody"))).not.toThrow();
    expect(() => validateIntakeFile("plan.pdf", Buffer.from("not a pdf"))).toThrow("valid PDF");
    expect(() => validateIntakeFile("workbook.xlsm", Buffer.from("PK"))).toThrow();
    expect(() => validateIntakeFile("../plan.pdf", Buffer.from("%PDF-"))).toThrow();
    expect(() => validateIntakeFile("large.pdf", Buffer.alloc(6 * 1024 * 1024))).toThrow("5 MB");
  });
  it("limits the body even when no content-length is provided", async () => {
    await expect(limitedRequestBody(new Request("https://example.test", { method: "POST", body: "12345" }), 3)).rejects.toThrow("12 MB");
  });
});
