export type ProjectVarianceInput = {
  baselineStartDate?: Date | string | null;
  baselineEndDate?: Date | string | null;
  startDate?: Date | string | null;
  targetEndDate?: Date | string | null;
  actualStartDate?: Date | string | null;
  actualEndDate?: Date | string | null;
};

export function calculateProjectScheduleVariance(input: ProjectVarianceInput) {
  const startVarianceDays = varianceDays(input.baselineStartDate, input.actualStartDate ?? input.startDate);
  const scheduleVarianceDays = varianceDays(input.baselineEndDate, input.actualEndDate ?? input.targetEndDate);
  return {
    startVarianceDays,
    scheduleVarianceDays,
    startVarianceLabel: varianceLabel(startVarianceDays),
    scheduleVarianceLabel: varianceLabel(scheduleVarianceDays)
  };
}

function varianceDays(baseline?: Date | string | null, actual?: Date | string | null) {
  if (!baseline || !actual) return null;
  const baselineDay = startOfDay(baseline);
  const actualDay = startOfDay(actual);
  return Math.round((actualDay.getTime() - baselineDay.getTime()) / (24 * 60 * 60 * 1000));
}

function varianceLabel(days: number | null) {
  if (days == null) return "Not available";
  if (days === 0) return "On time";
  if (days < 0) return `${Math.abs(days)} days ahead`;
  return `${days} days delayed`;
}

function startOfDay(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
