import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionButton } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getResourceBooking } from "@/modules/field-services/field-services-service";

type Params = { params: Promise<{ id: string }> };
export default async function ResourceBookingDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let booking: Awaited<ReturnType<typeof getResourceBooking>> | null = null;
  try {
    booking = await getResourceBooking(context, id);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) {
      throw error;
    }
  }

  if (!booking) {
    return <AppShell title="Booking" userName={userName}><AccessDenied /></AppShell>;
  }

  return (
    <AppShell title={booking.title} userName={userName}>
      <Card><CardHeader><CardTitle>Booking Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Resource: {booking.resource.displayName}</p><p>Type: {booking.bookingType.replaceAll("_", " ")}</p><p>Dates: {booking.startDate.toISOString().slice(0, 10)} - {booking.endDate.toISOString().slice(0, 10)}</p><p>Working days: {booking.workingDays.toString()}</p><p>Status: {booking.status.replaceAll("_", " ")}</p><p>Conflict: {booking.conflictStatus.replaceAll("_", " ")}</p><p>Project: {booking.project?.name ?? "-"}</p><p>Account: {booking.account?.name ?? "-"}</p><p>Linked ticket: {booking.helpdeskTicket ? <Link href={`/helpdesk/tickets/${booking.helpdeskTicket.id}`} className="font-medium text-brand-700">{booking.helpdeskTicket.ticketNumber}</Link> : "-"}</p></CardContent></Card>
      <div className="mt-4 flex gap-2">
        <JsonActionButton endpoint={`/api/v1/resource-bookings/${booking.id}`} method="PATCH" body={{ status: "confirmed" }} label="Confirm Booking" />
        <JsonActionButton endpoint={`/api/v1/resource-bookings/${booking.id}`} method="PATCH" body={{ status: "completed" }} label="Mark Complete" variant="secondary" />
      </div>
    </AppShell>
  );
}
