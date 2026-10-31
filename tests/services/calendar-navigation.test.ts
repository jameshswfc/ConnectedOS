import { describe, expect, it } from "vitest";
import { moveCalendarDate, parseCalendarDate, toDateParam } from "@/modules/scheduling/calendar-utils";
import { calendarHref } from "@/components/scheduling/module-calendar";

describe("calendar navigation", () => {
  it("keeps the first day of the intended month across British Summer Time", () => {
    const previous = moveCalendarDate("month", new Date(2026, 9, 31), -1);
    expect(toDateParam(previous)).toBe("2026-09-01");
    expect(toDateParam(parseCalendarDate("2026-07-01"))).toBe("2026-07-01");
  });
  it("preserves inactive-history selection when navigating dates and views", () => {
    expect(calendarHref("/field-services/schedule", "week", new Date(2026, 6, 1), { showInactive: "true" })).toBe("/field-services/schedule?showInactive=true&view=week&date=2026-07-01");
  });
});
