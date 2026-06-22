import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getResourceScheduleOverview } from "@/modules/field-services/field-services-service";
import { ModuleMetricCard } from "@/modules/operations/ui/module-ui";

export default async function ResourceReportsPage() {
  const { context, userName } = await getCrmPageContext();
  let report: Awaited<ReturnType<typeof getResourceScheduleOverview>> | null = null;
  try {
    report = await getResourceScheduleOverview(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!report) return <AppShell title="Resource Reports" userName={userName}><AccessDenied /></AppShell>;
  return <AppShell title="Resource Reports" userName={userName}><div className="grid gap-4 md:grid-cols-3"><ModuleMetricCard title="Active Resources" value={report.activeResources} /><ModuleMetricCard title="Open Bookings" value={report.openBookings} /><ModuleMetricCard title="Conflict Bookings" value={report.conflictBookings} /><ModuleMetricCard title="Confirmed Bookings" value={report.confirmedBookings} /><ModuleMetricCard title="Pending Leave" value={report.pendingLeave} /><ModuleMetricCard title="Approved Leave" value={report.approvedLeave} /></div></AppShell>;
}
