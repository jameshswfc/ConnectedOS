import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/leave-requests/[id]/reject/route";

vi.mock("@/modules/leave/leave-service", () => ({
  rejectLeaveRequest: vi.fn()
}));

vi.mock("@/modules/operations/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/modules/operations/api-utils")>("@/modules/operations/api-utils");
  return {
    ...actual,
    getModuleContext: vi.fn().mockResolvedValue({
      userId: "admin-1",
      permissions: ["leave.approve"],
      permissionLevel: "administrator",
      role: "Administrator"
    })
  };
});

describe("leave reject route", () => {
  it("returns a friendly validation error instead of a generic internal error when no rejection reason is supplied", async () => {
    const response = await POST(new Request("http://localhost/api/v1/leave-requests/leave-1/reject", { method: "POST" }), {
      params: Promise.resolve({ id: "leave-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.errors[0].message).toBe("rejectionReason: Unable to reject leave request. Please add a rejection reason and try again.");
  });
});
