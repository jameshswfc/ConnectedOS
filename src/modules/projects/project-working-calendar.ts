export function isWeekend(date: Date | string) {
  const day = toDate(date).getDay();
  return day === 0 || day === 6;
}

export function calculateWorkingDays(startDate: Date | string, endDate: Date | string, publicHolidays: (Date | string)[] = []) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  if (end < start) return 0;
  const holidayKeys = new Set(publicHolidays.map((date) => dateKey(date)));
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (!isWeekend(cursor) && !holidayKeys.has(dateKey(cursor))) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function addWorkingDays(startDate: Date | string, days: number, publicHolidays: (Date | string)[] = []) {
  const holidayKeys = new Set(publicHolidays.map((date) => dateKey(date)));
  const direction = days >= 0 ? 1 : -1;
  const absoluteDays = Math.abs(days);
  const cursor = startOfDay(startDate);
  if (absoluteDays === 0) return cursor;

  let moved = 0;
  while (moved < absoluteDays) {
    cursor.setDate(cursor.getDate() + direction);
    if (!isWeekend(cursor) && !holidayKeys.has(dateKey(cursor))) moved += 1;
  }
  return cursor;
}

export function dateKey(date: Date | string) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function startOfDay(value: Date | string) {
  const date = toDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDate(value: Date | string) {
  return value instanceof Date ? new Date(value) : new Date(value);
}
