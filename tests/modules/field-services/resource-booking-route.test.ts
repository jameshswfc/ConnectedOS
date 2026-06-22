import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/resource-bookings/route";

vi.mock("@/modules/field-services/field-services-service", () => ({
  createResourceBooking: vi.fn().mockRejectedValue(new Error("Unable to create resource booking. The selected project does not match the linked helpdesk ticket.")),
  listResourceBookings: vi.fn()
}));

vi.mock("@/modules/operations/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/modules/operations/api-utils")>("@/modules/operations/api-utils");
  return {
    ...actual,
    getModuleContext: vi.fn().mockResolvedValue({
      userId: "admin-1",
      permissions: ["field_services.manage_bookings"],
      permissionLevel: "administrator",
      role: "Administrator"
    })
  };
});

describe("resource booking route", () => {
  it("returns a structured validation error instead of a generic internal error for ticket booking mismatches", async () => {
    const response = await POST(new Request("http://localhost/api/v1/resource-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceId: "64849b61-fc3e-4c30-868d-b748497ac753",
        helpdeskTicketId: "11111111-1111-4111-8111-111111111111",
        bookingType: "support",
        title: "HD-2026-9001 - Guest WiFi outage",
        startDate: "2026-06-23",
        endDate: "2026-06-24",
        chargeable: true
      })
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.errors[0].code).toBe("VALIDATION_ERROR");
    expect(payload.errors[0].message).toBe("Unable to create resource booking. The selected project does not match the linked helpdesk ticket.");
  });
});
