import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getResourceScheduleOverview } from "@/modules/field-services/field-services-service";

export default async function FieldServicesPage() {
  const { context, userName } = await getCrmPageContext();
  let overview: Awaited<ReturnType<typeof getResourceScheduleOverview>> | null = null;
  try {
    overview = await getResourceScheduleOverview(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) {
      throw error;
    }
  }

  if (!overview) {
    return <AppShell title="Field Services" userName={userName}><AccessDenied /></AppShell>;
  }

  return (
    <AppShell title="Field Services" userName={userName}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/field-services/resources"><Button variant="secondary">Resources</Button></Link>
        <Link href="/field-services/schedule"><Button variant="secondary">Resource Schedule</Button></Link>
        <Link href="/field-services/bookings/new"><Button>New Booking</Button></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Active resources" value={overview.activeResources} />
        <Metric title="Open bookings" value={overview.openBookings} />
        <Metric title="Conflicts" value={overview.conflictBookings} />
        <Metric title="Confirmed bookings" value={overview.confirmedBookings} />
        <Metric title="Pending leave" value={overview.pendingLeave} />
        <Metric title="Approved leave" value={overview.approvedLeave} />
      </div>
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-brand-900">{value}</p></CardContent></Card>;
}
