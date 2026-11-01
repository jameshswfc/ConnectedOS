import type { ModuleCalendarEntry, ModuleCalendarResource } from "@/components/scheduling/module-calendar";
import { addDays, overlapsDay, startOfDay } from "./calendar-utils";

// Date coverage, not effort utilisation: legacy assignments do not carry hours per day.
export function scheduleAvailability(resources: ModuleCalendarResource[], entries: ModuleCalendarEntry[], start: Date, end: Date) {
  const weekdays: Date[] = [];
  for (let day = startOfDay(start); day <= end; day = addDays(day, 1)) {
    if (day.getDay() !== 0 && day.getDay() !== 6) weekdays.push(day);
  }
  return resources.filter((resource) => resource.active !== false).map((resource) => {
    const rows = [...new Map(entries.filter((entry) => entry.resourceId === resource.id && entry.status !== "cancelled").map((entry) => [entry.id, entry])).values()];
    let booked = 0, leave = 0, pending = 0, overlaps = 0, free = 0;
    for (const day of weekdays) {
      const onDay = rows.filter((entry) => overlapsDay(entry.startDate, entry.endDate, day));
      const work = onDay.filter((entry) => !["leave_approved", "leave_pending"].includes(entry.category));
      const unavailable = onDay.some((entry) => entry.category === "leave_approved");
      if (work.length) booked++;
      if (unavailable) leave++;
      if (onDay.some((entry) => entry.category === "leave_pending")) pending++;
      if (work.length > 1 || (work.length && unavailable)) overlaps++;
      if (!work.length && !unavailable) free++;
    }
    return { ...resource, weekdays: weekdays.length, booked, leave, pending, overlaps, free };
  }).sort((a, b) => b.overlaps - a.overlaps || b.free - a.free || a.label.localeCompare(b.label));
}
