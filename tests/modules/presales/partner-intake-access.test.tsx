import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ context: vi.fn(), routes: vi.fn(), invitations: vi.fn(), submissions: vi.fn(), detail: vi.fn(), options: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  documentRoute: { findMany: mocks.routes }, presalesInvitation: { findMany: mocks.invitations },
  partnerSubmission: { findMany: mocks.submissions, findUnique: mocks.detail }
} }));
vi.mock("@/modules/crm/ui/crm-page-context", () => ({ getCrmPageContext: mocks.context }));
vi.mock("@/modules/presales/presales-service", () => ({ getPresalesCreateOptions: mocks.options }));
vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/modules/presales/ui/partner-intake-management", () => ({
  HotelMappingForm: () => <div>Mapping editor</div>, InvitationForm: () => <div>Invitation editor</div>,
  RevokeInvitationButton: () => <button>Revoke invitation</button>, IntakeReviewForm: () => <div>Conversion editor</div>
}));

import IntakePage from "@/app/presales/intake/page";
import IntakeDetailPage from "@/app/presales/intake/[id]/page";
import { assertPartnerIntakeAccess, assertPartnerIntakeReadAccess } from "@/modules/presales/partner-intake-service";
import { documentApiError } from "@/services/documents/document-api-error";

const details = { requesterName: "Pilot Contact", requesterEmail: "pilot@example.test", requesterPhone: "", company: "Pilot partner", hotelName: "Pilot hotel", brand: "Marriott", location: "UK", address: "Synthetic pilot address", propertyCode: "", rooms: 100, floors: 3, scope: "Synthetic pilot scope", systems: "WiFi", existingEquipment: "", constraints: "", requestedDate: "", consent: true };
const reader = { userId: "stephen", permissions: ["presales.create"] };

describe("partner recipient read-only access", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv("PARTNER_INTAKE_NOTIFY_USER_IDS", "james,tim,stephen");
    mocks.context.mockResolvedValue({ context: reader, userName: "Stephen" });
    mocks.submissions.mockResolvedValue([{ id: "submission", details, createdAt: new Date(), invitation: { partner: "Pilot partner" }, _count: { attachments: 1 } }]);
    mocks.detail.mockResolvedValue({ id: "submission", details, status: "received", presalesRequestId: null, invitation: { partner: "Pilot partner", route: details }, attachments: [{ id: "file", fileName: "pilot.txt", scanStatus: "clean" }] });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("renders the notification recipient queue without invitation or routing administration", async () => {
    const html = renderToStaticMarkup(await IntakePage());
    expect(html).toContain("Pilot hotel"); expect(html).toContain("/presales/intake/submission");
    expect(html).not.toContain("Invitation editor"); expect(html).not.toContain("Mapping editor");
    expect(mocks.routes).not.toHaveBeenCalled(); expect(mocks.invitations).not.toHaveBeenCalled();
  });
  it("renders submission and clean attachment without exposing conversion controls", async () => {
    const html = renderToStaticMarkup(await IntakeDetailPage({ params: Promise.resolve({ id: "submission" }) }));
    expect(html).toContain("Synthetic pilot scope"); expect(html).toContain("Download");
    expect(html).not.toContain("Conversion editor"); expect(mocks.options).not.toHaveBeenCalled();
  });
  it("does not render a download for quarantined files", async () => {
    const row = await mocks.detail(); row.attachments[0].scanStatus = "quarantined"; mocks.detail.mockResolvedValue(row);
    const html = renderToStaticMarkup(await IntakeDetailPage({ params: Promise.resolve({ id: "submission" }) }));
    expect(html).toContain("quarantined"); expect(html).not.toContain("Download");
  });
  it("denies unconfigured viewers before querying submissions", async () => {
    mocks.context.mockResolvedValue({ context: { ...reader, userId: "other" }, userName: "Other" });
    const html = renderToStaticMarkup(await IntakePage());
    expect(html).toContain("Access denied"); expect(mocks.submissions).not.toHaveBeenCalled();
  });
  it("retains JSON 403 on management actions even when reading is allowed", async () => {
    expect(() => assertPartnerIntakeReadAccess(reader)).not.toThrow();
    let failure: unknown;
    try { assertPartnerIntakeAccess(reader); } catch (error) { failure = error; }
    const response = documentApiError(failure);
    expect(response.status).toBe(403); expect(response.headers.get("content-type")).toContain("application/json");
  });
});
