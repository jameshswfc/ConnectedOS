import type { PresalesRequestStatus } from "@prisma/client";

export type OpportunityHealthStatus = "green" | "amber" | "red";

type HealthActivity = {
  createdAt?: Date | string | null;
  completedAt?: Date | string | null;
};

type HealthPresalesRequest = {
  internalDeadline?: Date | string | null;
  status?: PresalesRequestStatus | string | null;
  slaStatus?: string | null;
};

export type OpportunityHealthInput = {
  nextActionDate?: Date | string | null;
  expectedCloseDate?: Date | string | null;
  lastActivityAt?: Date | string | null;
  updatedAt?: Date | string | null;
  salesActivities?: HealthActivity[];
  presalesRequests?: HealthPresalesRequest[];
};

const completePresalesStatuses = new Set(["complete", "cancelled"]);

export function calculateOpportunityHealth(input: OpportunityHealthInput, now = new Date()): OpportunityHealthStatus {
  const today = startOfDay(now);
  const lastActivity = latestDate([
    input.lastActivityAt,
    ...(input.salesActivities ?? []).map((activity) => activity.completedAt ?? activity.createdAt)
  ]);
  const daysSinceActivity = lastActivity ? daysBetween(startOfDay(lastActivity), today) : Number.POSITIVE_INFINITY;
  const nextAction = input.nextActionDate ? startOfDay(input.nextActionDate) : null;
  const closeDate = input.expectedCloseDate ? startOfDay(input.expectedCloseDate) : null;
  const activePresales = (input.presalesRequests ?? []).filter((request) => !completePresalesStatuses.has(String(request.status)));

  if (
    daysSinceActivity > 14 ||
    (nextAction && nextAction < today) ||
    (closeDate && closeDate < today) ||
    activePresales.some((request) => request.slaStatus === "overdue" || (request.internalDeadline && startOfDay(request.internalDeadline) < today))
  ) {
    return "red";
  }

  if (
    (daysSinceActivity >= 7 && daysSinceActivity <= 14) ||
    (nextAction && hoursBetween(now, nextAction) <= 48 && nextAction >= today) ||
    activePresales.some((request) => request.slaStatus === "due_soon" || (request.internalDeadline && hoursBetween(now, startOfDay(request.internalDeadline)) <= 48))
  ) {
    return "amber";
  }

  if (nextAction && (!closeDate || closeDate >= today) && daysSinceActivity < 7) {
    return "green";
  }

  return "amber";
}

export function matchesHealthFilter(status: OpportunityHealthStatus, filters: OpportunityHealthStatus[] = []) {
  return filters.length === 0 || filters.includes(status);
}

function latestDate(values: (Date | string | null | undefined)[]) {
  const timestamps = values.map((value) => value ? new Date(value).getTime() : Number.NaN).filter((value) => !Number.isNaN(value));
  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}

function startOfDay(value: Date | string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function hoursBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / (60 * 60 * 1000);
}
