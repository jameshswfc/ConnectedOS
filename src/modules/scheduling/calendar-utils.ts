export type CalendarView = "month" | "week" | "day" | "resource";

export function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: Date) {
  const date = startOfDay(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function startOfWeek(value: Date) {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function endOfWeek(value: Date) {
  return endOfDay(addDays(startOfWeek(value), 6));
}

export function startOfMonthGrid(value: Date) {
  return startOfWeek(new Date(value.getFullYear(), value.getMonth(), 1));
}

export function endOfMonthGrid(value: Date) {
  return endOfWeek(new Date(value.getFullYear(), value.getMonth() + 1, 0));
}

export function parseCalendarDate(value?: string) {
  if (!value) return startOfDay(new Date());
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return startOfDay(new Date());
  return startOfDay(parsed);
}

export function getCalendarRange(view: CalendarView, anchorDate: Date) {
  if (view === "day") {
    return { startDate: startOfDay(anchorDate), endDate: endOfDay(anchorDate) };
  }
  if (view === "week" || view === "resource") {
    return { startDate: startOfWeek(anchorDate), endDate: endOfWeek(anchorDate) };
  }
  return { startDate: startOfMonthGrid(anchorDate), endDate: endOfMonthGrid(anchorDate) };
}

export function moveCalendarDate(view: CalendarView, anchorDate: Date, direction: -1 | 1) {
  if (view === "day") return addDays(anchorDate, direction);
  if (view === "week" || view === "resource") return addDays(anchorDate, direction * 7);
  return new Date(anchorDate.getFullYear(), anchorDate.getMonth() + direction, 1);
}

export function buildCalendarDays(view: CalendarView, anchorDate: Date) {
  const { startDate, endDate } = getCalendarRange(view, anchorDate);
  const days: Date[] = [];
  for (let current = new Date(startDate); current <= endDate; current = addDays(current, 1)) {
    days.push(new Date(current));
  }
  return days;
}

export function formatCalendarDayLabel(value: Date, view: CalendarView) {
  if (view === "month") return value.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
  if (view === "day") return value.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
  return value.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function formatCalendarWeekLabel(value: Date) {
  return `WC ${value.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
}

export function toDateParam(value: Date) {
  return startOfDay(value).toISOString().slice(0, 10);
}

export function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

export function overlapsDay(startDate: Date, endDate: Date, day: Date) {
  const start = startOfDay(startDate).getTime();
  const end = startOfDay(endDate).getTime();
  const compare = startOfDay(day).getTime();
  return compare >= start && compare <= end;
}
