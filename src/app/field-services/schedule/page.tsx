import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { ModuleCalendar } from "@/components/scheduling/module-calendar";
import { Button } from "@/components/ui/button";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { type FieldServicesCalendarView, getFieldServicesCalendar } from "@/modules/field-services/field-services-service";
import { parseCalendarDate, getCalendarRange } from "@/modules/scheduling/calendar-utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResourceSchedulePage({ searchParams }: { searchParams?: SearchParams }) {
  const { context, userName } = await getCrmPageContext();
  const params = searchParams ? await searchParams : {};
  const requestedView = typeof params.view === "string" ? params.view : "month";
  const view: FieldServicesCalendarView = ["month", "week", "day", "resource"].includes(requestedView) ? requestedView as FieldServicesCalendarView : "month";
  const anchorDate = parseCalendarDate(typeof params.date === "string" ? params.date : undefined);
  const showInactive = params.showInactive === "true";

  let calendar: Awaited<ReturnType<typeof getFieldServicesCalendar>> | null = null;
  try {
    calendar = await getFieldServicesCalendar(context, getCalendarRange(view, anchorDate), { includeInactive: showInactive });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) {
      throw error;
    }
  }

  if (!calendar) {
    return <AppShell title="Resource Schedule" userName={userName}><AccessDenied /></AppShell>;
  }

  return (
    <AppShell title="Resource Schedule" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href={showInactive ? "/field-services/schedule" : "/field-services/schedule?showInactive=true"}>
          <Button variant="secondary">{showInactive ? "Hide inactive history" : "Show inactive history"}</Button>
        </Link>
        <Link href="/field-services/resources"><Button variant="secondary">Resources</Button></Link>
        <Link href="/field-services/bookings/new"><Button>New Booking</Button></Link>
      </div>
      <ModuleCalendar
        basePath="/field-services/schedule"
        view={view}
        anchorDate={anchorDate}
        entries={calendar.entries}
        resources={calendar.resources}
        heading="Field Services Calendar"
      />
    </AppShell>
  );
}
