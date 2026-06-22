import { describe, expect, it } from "vitest";
import { leaveRequestCreateSchema } from "@/modules/leave/leave-schemas";

describe("leave schemas", () => {
  it("defaults leave requests to draft", () => {
    const result = leaveRequestCreateSchema.parse({
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      leaveType: "annual_leave"
    });

    expect(result.status).toBe("draft");
    expect(result.startDate).toBeInstanceOf(Date);
  });
});
