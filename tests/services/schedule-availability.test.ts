import { describe, expect, it } from "vitest";
import { scheduleAvailability } from "@/modules/scheduling/schedule-availability";
import type { ModuleCalendarEntry } from "@/components/scheduling/module-calendar";
const entry = (id: string, category: ModuleCalendarEntry["category"], startDate: string, endDate = startDate): ModuleCalendarEntry => ({ id, category, startDate: new Date(startDate), endDate: new Date(endDate), subtitle: "", resourceId: "r", title: id, href: "/field-services/schedule", status: "confirmed" });
describe("schedule date coverage", () => {
  it("excludes weekends, inactive resources and cancelled work", () => {
    const rows = scheduleAvailability([{ id: "r", label: "Engineer", active: true }, { id: "inactive", label: "Inactive", active: false }], [{ ...entry("cancelled", "project", "2026-11-02"), status: "cancelled" }], new Date("2026-11-02"), new Date("2026-11-08"));
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ weekdays: 5, free: 5, booked: 0 });
  });
  it("counts overlaps and leave without counting duplicate entry IDs twice", () => {
    const booking = entry("b", "project", "2026-11-02");
    const rows = scheduleAvailability([{ id: "r", label: "Engineer" }], [booking, booking, entry("leave", "leave_approved", "2026-11-02"), entry("pending", "leave_pending", "2026-11-03")], new Date("2026-11-02"), new Date("2026-11-06"));
    expect(rows[0]).toMatchObject({ booked: 1, leave: 1, pending: 1, overlaps: 1, free: 4 });
  });
});
