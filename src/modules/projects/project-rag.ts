import { ProjectRagStatus, ProjectStatus, ProjectTaskStatus } from "@prisma/client";

type ProjectRagInput = {
  status?: ProjectStatus | string | null;
  targetEndDate?: Date | string | null;
  totalResourceDaysBudget?: number | string | null;
  totalResourceDaysScheduled?: number | string | null;
  totalResourceDaysUsed?: number | string | null;
  tasks?: { status?: ProjectTaskStatus | string | null; endDate?: Date | string | null; deletedAt?: Date | null }[];
};

const completeStatuses = new Set(["completed", "closed", "cancelled"]);

export function calculateProjectRag(input: ProjectRagInput, now = new Date()): ProjectRagStatus {
  const status = String(input.status ?? "");
  if (completeStatuses.has(status)) return ProjectRagStatus.green;
  const today = startOfDay(now);
  const targetEndDate = input.targetEndDate ? startOfDay(input.targetEndDate) : null;
  const budget = toNumber(input.totalResourceDaysBudget);
  const scheduled = toNumber(input.totalResourceDaysScheduled);
  const used = toNumber(input.totalResourceDaysUsed);
  const remaining = budget - Math.max(scheduled, used);
  const remainingPercent = budget > 0 ? (remaining / budget) * 100 : 100;
  const hasCriticalOverdueTask = (input.tasks ?? []).some((task) => {
    if (task.deletedAt || task.status === ProjectTaskStatus.complete || task.status === ProjectTaskStatus.cancelled || !task.endDate) return false;
    return startOfDay(task.endDate) < today;
  });

  if ((budget > 0 && remaining <= 0) || Boolean(targetEndDate && targetEndDate < today) || hasCriticalOverdueTask) {
    return ProjectRagStatus.red;
  }

  if ((budget > 0 && remainingPercent <= 25) || Boolean(targetEndDate && daysBetween(today, targetEndDate) <= 7)) {
    return ProjectRagStatus.amber;
  }

  return ProjectRagStatus.green;
}

function toNumber(value: number | string | null | undefined) {
  return value == null ? 0 : Number(value);
}

function startOfDay(value: Date | string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}
