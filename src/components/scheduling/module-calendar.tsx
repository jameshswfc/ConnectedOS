import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarView, buildCalendarDays, formatCalendarDayLabel, formatCalendarWeekLabel, getCalendarRange, isSameDay, moveCalendarDate, overlapsDay, toDateParam } from "@/modules/scheduling/calendar-utils";
import { ModuleStatusBadge, formatModuleDate } from "@/modules/operations/ui/module-ui";

export type ModuleCalendarEntry = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  startDate: Date;
  endDate: Date;
  category: "project" | "non_project" | "leave_approved" | "leave_pending" | "conflict";
  status: string;
  resourceId?: string | null;
  resourceName?: string | null;
};

export type ModuleCalendarResource = {
  id: string;
  label: string;
  subtitle?: string | null;
  active?: boolean;
};

export function ModuleCalendar({
  basePath,
  view,
  anchorDate,
  entries,
  resources,
  heading = "Calendar",
  showResourceView = true
}: {
  basePath: string;
  view: CalendarView;
  anchorDate: Date;
  entries: ModuleCalendarEntry[];
  resources?: ModuleCalendarResource[];
  heading?: string;
  showResourceView?: boolean;
}) {
  const days = buildCalendarDays(view, anchorDate);
  const { startDate, endDate } = getCalendarRange(view, anchorDate);
  const previousDate = moveCalendarDate(view, anchorDate, -1);
  const nextDate = moveCalendarDate(view, anchorDate, 1);
  const resourceRows = resources?.length ? resources : buildResourceRows(entries);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{heading}</p>
          <h2 className="text-xl font-semibold text-slate-900">
            {formatModuleDate(startDate)}{view === "day" ? "" : ` - ${formatModuleDate(endDate)}`}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${basePath}?view=${view}&date=${toDateParam(previousDate)}`}><Button variant="secondary">Previous</Button></Link>
          <Link href={`${basePath}?view=${view}&date=${toDateParam(new Date())}`}><Button variant="secondary">Today</Button></Link>
          <Link href={`${basePath}?view=${view}&date=${toDateParam(nextDate)}`}><Button variant="secondary">Next</Button></Link>
          <div className="ml-2 flex flex-wrap gap-2">
            <CalendarViewButton basePath={basePath} currentView={view} anchorDate={anchorDate} value="month" />
            <CalendarViewButton basePath={basePath} currentView={view} anchorDate={anchorDate} value="week" />
            <CalendarViewButton basePath={basePath} currentView={view} anchorDate={anchorDate} value="day" />
            {showResourceView ? <CalendarViewButton basePath={basePath} currentView={view} anchorDate={anchorDate} value="resource" /> : null}
          </div>
        </div>
      </div>

      {view === "month" ? (
        <MonthCalendarGrid days={days} anchorDate={anchorDate} entries={entries} />
      ) : view === "resource" ? (
        <ResourceCalendarGrid days={days} entries={entries} resources={resourceRows} />
      ) : (
        <WeekCalendarGrid days={days} entries={entries} />
      )}
    </div>
  );
}

function CalendarViewButton({
  basePath,
  currentView,
  anchorDate,
  value
}: {
  basePath: string;
  currentView: CalendarView;
  anchorDate: Date;
  value: CalendarView;
}) {
  const label = value === "resource" ? "Resource Grid" : value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <Link href={`${basePath}?view=${value}&date=${toDateParam(anchorDate)}`}>
      <Button variant={currentView === value ? "primary" : "secondary"}>{label}</Button>
    </Link>
  );
}

function MonthCalendarGrid({
  days,
  anchorDate,
  entries
}: {
  days: Date[];
  anchorDate: Date;
  entries: ModuleCalendarEntry[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="grid min-w-[980px] grid-cols-7">
        {days.map((day) => {
          const dayEntries = entries.filter((entry) => overlapsDay(entry.startDate, entry.endDate, day));
          return (
            <div key={day.toISOString()} className="min-h-[168px] border-b border-r border-slate-200 p-3 align-top">
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-sm font-semibold ${day.getMonth() === anchorDate.getMonth() ? "text-slate-900" : "text-slate-400"}`}>
                  {formatCalendarDayLabel(day, "month")}
                </span>
                {isSameDay(day, new Date()) ? <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">Today</span> : null}
              </div>
              <div className="space-y-2">
                {dayEntries.length ? dayEntries.map((entry) => <CalendarEntryPill key={`${entry.id}-${day.toISOString()}`} entry={entry} compact />) : <p className="text-xs text-slate-400">No scheduled items</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekCalendarGrid({
  days,
  entries
}: {
  days: Date[];
  entries: ModuleCalendarEntry[];
}) {
  const isDayView = days.length === 1;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className={`${isDayView ? "min-w-[420px] grid-cols-1" : "min-w-[980px] grid-cols-7"} grid`}>
        {days.map((day) => {
          const dayEntries = entries.filter((entry) => overlapsDay(entry.startDate, entry.endDate, day));
          return (
            <div key={day.toISOString()} className="min-h-[360px] border-r border-slate-200 p-4 last:border-r-0">
              <div className="mb-3 border-b border-slate-100 pb-2">
                <p className="text-sm font-semibold text-slate-900">{formatCalendarDayLabel(day, isDayView ? "day" : "week")}</p>
                {!isDayView ? <p className="text-xs text-slate-500">{formatCalendarWeekLabel(day)}</p> : null}
              </div>
              <div className="space-y-3">
                {dayEntries.length ? dayEntries.map((entry) => <CalendarEntryPill key={`${entry.id}-${day.toISOString()}`} entry={entry} />) : <p className="text-sm text-slate-400">No scheduled items</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResourceCalendarGrid({
  days,
  entries,
  resources
}: {
  days: Date[];
  entries: ModuleCalendarEntry[];
  resources: ModuleCalendarResource[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="min-w-[1180px]">
        <div className="grid grid-cols-[260px_repeat(7,minmax(120px,1fr))] border-b border-slate-200 bg-slate-50">
          <div className="border-r border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Resource</div>
          {days.map((day) => (
            <div key={day.toISOString()} className="border-r border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900 last:border-r-0">
              <div>{formatCalendarDayLabel(day, "week")}</div>
              <div className="text-xs font-normal text-slate-500">{formatCalendarWeekLabel(day)}</div>
            </div>
          ))}
        </div>
        {resources.map((resource) => (
          <div key={resource.id} className="grid grid-cols-[260px_repeat(7,minmax(120px,1fr))] border-b border-slate-200 last:border-b-0">
            <div className="border-r border-slate-200 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">{resource.label}</p>
              {resource.subtitle ? <p className="text-xs text-slate-500">{resource.subtitle}</p> : null}
              {resource.active === false ? <p className="mt-1 text-xs font-medium text-amber-700">Inactive</p> : null}
            </div>
            {days.map((day) => {
              const dayEntries = entries.filter((entry) => entry.resourceId === resource.id && overlapsDay(entry.startDate, entry.endDate, day));
              return (
                <div key={`${resource.id}-${day.toISOString()}`} className="min-h-[110px] border-r border-slate-200 p-2 last:border-r-0">
                  <div className="space-y-2">
                    {dayEntries.length ? dayEntries.map((entry) => <CalendarEntryPill key={`${entry.id}-${day.toISOString()}`} entry={entry} compact />) : <p className="text-xs text-slate-300">Available</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarEntryPill({ entry, compact = false }: { entry: ModuleCalendarEntry; compact?: boolean }) {
  const colors = entryPillClasses(entry.category);
  return (
    <Link href={entry.href} className={`block rounded-md border px-3 py-2 text-left shadow-sm transition hover:brightness-95 ${colors}`}>
      <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>{entry.title}</p>
      <p className={`${compact ? "text-[11px]" : "text-xs"} opacity-90`}>{entry.subtitle || `${formatModuleDate(entry.startDate)} - ${formatModuleDate(entry.endDate)}`}</p>
      {!compact ? <div className="mt-2"><ModuleStatusBadge value={entry.status} /></div> : null}
    </Link>
  );
}

function entryPillClasses(category: ModuleCalendarEntry["category"]) {
  if (category === "project") return "border-brand-200 bg-brand-50 text-brand-900";
  if (category === "leave_approved") return "border-red-200 bg-red-50 text-red-900";
  if (category === "leave_pending") return "border-amber-200 bg-amber-50 text-amber-900";
  if (category === "conflict") return "border-orange-300 bg-orange-50 text-orange-900";
  return "border-sky-200 bg-sky-50 text-sky-900";
}

function buildResourceRows(entries: ModuleCalendarEntry[]) {
  const map = new Map<string, ModuleCalendarResource>();
  for (const entry of entries) {
    if (!entry.resourceId || !entry.resourceName) continue;
    if (!map.has(entry.resourceId)) {
      map.set(entry.resourceId, { id: entry.resourceId, label: entry.resourceName });
    }
  }
  return [...map.values()].sort((left, right) => left.label.localeCompare(right.label));
}
