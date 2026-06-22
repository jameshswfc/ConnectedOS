import { describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/v1/helpdesk/tickets/[id]/route";
import { updateHelpdeskTicket } from "@/modules/helpdesk/helpdesk-service";

vi.mock("@/modules/helpdesk/helpdesk-service", () => ({
  getHelpdeskTicket: vi.fn(),
  updateHelpdeskTicket: vi.fn().mockRejectedValue(new Error("Unable to resolve ticket. Please add a resolution note and try again."))
}));

vi.mock("@/modules/operations/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/modules/operations/api-utils")>("@/modules/operations/api-utils");
  return {
    ...actual,
    getModuleContext: vi.fn().mockResolvedValue({
      userId: "admin-1",
      permissions: ["helpdesk.update"],
      permissionLevel: "administrator",
      role: "Administrator"
    })
  };
});

describe("helpdesk ticket route", () => {
  it("returns a structured validation error instead of a generic internal error when resolve note is missing", async () => {
    const response = await PATCH(new Request("http://localhost/api/v1/helpdesk/tickets/ticket-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" })
    }), {
      params: Promise.resolve({ id: "ticket-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.errors[0].code).toBe("VALIDATION_ERROR");
    expect(payload.errors[0].message).toBe("Unable to resolve ticket. Please add a resolution note and try again.");
  });

  it("returns a structured validation error when a ticket must be resolved before it can be closed", async () => {
    vi.mocked(updateHelpdeskTicket).mockRejectedValueOnce(new Error("Please resolve this ticket before closing it."));

    const response = await PATCH(new Request("http://localhost/api/v1/helpdesk/tickets/ticket-2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" })
    }), {
      params: Promise.resolve({ id: "ticket-2" })
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.errors[0].code).toBe("VALIDATION_ERROR");
    expect(payload.errors[0].message).toBe("Please resolve this ticket before closing it.");
  });
});
