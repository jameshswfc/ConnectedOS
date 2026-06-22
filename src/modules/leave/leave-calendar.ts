import type { CalendarView } from "@/modules/scheduling/calendar-utils";
import { getCalendarRange } from "@/modules/scheduling/calendar-utils";

type LeaveRequestCalendarShape = {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  leaveType: string;
  status: string;
  user: {
    displayName: string;
    email?: string | null;
    isActive: boolean;
    deletedAt?: Date | null;
    deactivatedAt?: Date | null;
  };
};

export function buildLeaveCalendarData(requests: LeaveRequestCalendarShape[], view: CalendarView, anchorDate: Date) {
  const range = getCalendarRange(view, anchorDate);
  const filtered = requests.filter((request) =>
    request.endDate >= range.startDate
    && request.startDate <= range.endDate
    && request.user.isActive
    && !request.user.deletedAt
    && !request.user.deactivatedAt
  );

  return {
    resources: [...new Map(filtered.map((request) => [request.userId, {
      id: request.userId,
      label: request.user.displayName,
      subtitle: request.user.email ?? null,
      active: true
    }])).values()],
    entries: filtered.map((request) => ({
      id: request.id,
      href: `/leave/${request.id}`,
      title: `${request.user.displayName} - ${request.leaveType.replaceAll("_", " ")}`,
      subtitle: `${request.leaveType.replaceAll("_", " ")} | ${request.status.replaceAll("_", " ")}`,
      startDate: request.startDate,
      endDate: request.endDate,
      category: request.status === "approved" ? "leave_approved" as const : "leave_pending" as const,
      status: request.status,
      resourceId: request.userId,
      resourceName: request.user.displayName
    }))
  };
}
