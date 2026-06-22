import { describe, expect, it } from "vitest";
import { buildLeaveCalendarData } from "@/modules/leave/leave-calendar";

describe("leave calendar", () => {
  it("uses real active users only and keeps approved/submitted leave distinct", () => {
    const data = buildLeaveCalendarData([
      {
        id: "leave-1",
        userId: "user-1",
        startDate: new Date("2026-06-16"),
        endDate: new Date("2026-06-18"),
        leaveType: "annual_leave",
        status: "approved",
        user: {
          displayName: "James Harrison",
          email: "james@connectedhsp.com",
          isActive: true
        }
      },
      {
        id: "leave-2",
        userId: "user-2",
        startDate: new Date("2026-06-20"),
        endDate: new Date("2026-06-21"),
        leaveType: "training",
        status: "submitted",
        user: {
          displayName: "Olivia Reed",
          email: "olivia@connectedhsp.com",
          isActive: true
        }
      },
      {
        id: "leave-3",
        userId: "user-3",
        startDate: new Date("2026-06-22"),
        endDate: new Date("2026-06-23"),
        leaveType: "annual_leave",
        status: "approved",
        user: {
          displayName: "Inactive User",
          email: "inactive@connectedhsp.com",
          isActive: false
        }
      }
    ], "month", new Date("2026-06-15"));

    expect(data.resources.map((resource) => resource.label)).toEqual(["James Harrison", "Olivia Reed"]);
    expect(data.entries.find((entry) => entry.id === "leave-1")?.category).toBe("leave_approved");
    expect(data.entries.find((entry) => entry.id === "leave-2")?.category).toBe("leave_pending");
    expect(data.entries.some((entry) => entry.title.includes("Placeholder"))).toBe(false);
  });
});
