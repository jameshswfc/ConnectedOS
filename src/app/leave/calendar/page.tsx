import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { ModuleCalendar } from "@/components/scheduling/module-calendar";
import { Button } from "@/components/ui/button";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { buildLeaveCalendarData } from "@/modules/leave/leave-calendar";
import { listLeaveRequests } from "@/modules/leave/leave-service";
import { type CalendarView, parseCalendarDate } from "@/modules/scheduling/calendar-utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LeaveCalendarPage({ searchParams }: { searchParams?: SearchParams }) {
  const { context, userName } = await getCrmPageContext();
  const params = searchParams ? await searchParams : {};
  const requestedView = typeof params.view === "string" ? params.view : "month";
  const view: CalendarView = requestedView === "week" ? "week" : "month";
  const anchorDate = parseCalendarDate(typeof params.date === "string" ? params.date : undefined);

  let requests: Awaited<ReturnType<typeof listLeaveRequests>> | null = null;
  try {
    requests = await listLeaveRequests(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }

  if (!requests) return <AppShell title="Leave Calendar" userName={userName}><AccessDenied /></AppShell>;

  const calendar = buildLeaveCalendarData(requests, view, anchorDate);

  return (
    <AppShell title="Leave Calendar" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href="/leave"><Button variant="secondary">Leave Requests</Button></Link>
        <Link href="/leave/new"><Button>Request Leave</Button></Link>
      </div>
      <ModuleCalendar
        basePath="/leave/calendar"
        view={view}
        anchorDate={anchorDate}
        entries={calendar.entries}
        resources={calendar.resources}
        heading="Leave Calendar"
        showResourceView={false}
      />
    </AppShell>
  );
}
