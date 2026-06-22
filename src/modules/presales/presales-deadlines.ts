import { PresalesRagStatus, PresalesRequestStatus, PresalesSlaStatus } from "@prisma/client";

const dueSoonHours = 48;

export function calculatePresalesDeadlineStatus(deadline: Date, status: PresalesRequestStatus, now = new Date()) {
  if (status === PresalesRequestStatus.complete) {
    return { slaStatus: PresalesSlaStatus.complete, ragStatus: PresalesRagStatus.green };
  }

  const deadlineEnd = endOfDay(deadline);
  const hoursRemaining = (deadlineEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursRemaining < 0) {
    return { slaStatus: PresalesSlaStatus.overdue, ragStatus: PresalesRagStatus.red };
  }

  if (hoursRemaining <= dueSoonHours) {
    return { slaStatus: PresalesSlaStatus.due_soon, ragStatus: PresalesRagStatus.amber };
  }

  return { slaStatus: PresalesSlaStatus.on_track, ragStatus: PresalesRagStatus.green };
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

