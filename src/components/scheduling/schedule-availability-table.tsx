import { scheduleAvailability } from "@/modules/scheduling/schedule-availability";
import type { ModuleCalendarEntry, ModuleCalendarResource } from "./module-calendar";

export function ScheduleAvailabilityTable({ resources, entries, start, end }: { resources: ModuleCalendarResource[]; entries: ModuleCalendarEntry[]; start: Date; end: Date }) {
  const rows = scheduleAvailability(resources, entries, start, end);
  return <section className="mb-5" aria-label="Schedule availability">
    <h2 className="mb-3 text-lg font-semibold text-brand-900">Availability in this period</h2>
    <div className="overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[660px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Resource", "Weekdays", "Booked dates", "Leave", "Pending leave", "Unbooked dates", "Overlapping dates"].map((label) => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="p-3 font-medium">{row.label}</td><td className="p-3">{row.weekdays}</td><td className="p-3">{row.booked}</td><td className="p-3">{row.leave}</td><td className="p-3">{row.pending}</td><td className="p-3 text-green-800">{row.free}</td><td className={`p-3 ${row.overlaps ? "font-semibold text-red-700" : "text-slate-500"}`}>{row.overlaps || "None"}</td></tr>)}</tbody></table></div>
    <p className="mt-2 text-xs text-slate-500">Weekday date coverage from visible bookings, project assignments and leave. Partial-day bookings may overlap legitimately. Unbooked dates are not confirmed availability; public holidays are not included.</p>
  </section>;
}
