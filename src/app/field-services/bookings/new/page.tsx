import { ResourceBookingStatus, ResourceBookingType } from "@prisma/client";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listBookableResources } from "@/modules/field-services/field-services-service";
import { getHelpdeskTicket } from "@/modules/helpdesk/helpdesk-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewResourceBookingPage({ searchParams }: { searchParams?: SearchParams }) {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("field_services.manage_bookings") && !context.permissions.includes("schedule.create_booking") && context.permissionLevel !== "administrator") {
    return <AppShell title="New Booking" userName={userName}><AccessDenied /></AppShell>;
  }
  const resources = await listBookableResources(context);
  const params = searchParams ? await searchParams : {};
  const value = (key: string) => {
    const raw = params[key];
    return typeof raw === "string" ? raw : "";
  };
  const helpdeskTicketId = value("helpdeskTicketId");
  const helpdeskTicket = helpdeskTicketId ? await getHelpdeskTicket(context, helpdeskTicketId) : null;
  const derivedTitle = helpdeskTicket ? `${helpdeskTicket.ticketNumber} - ${helpdeskTicket.title}` : value("title");
  const derivedLocation = helpdeskTicket?.account?.city ?? helpdeskTicket?.asset?.location ?? value("location");
  const derivedDescription = helpdeskTicket
    ? [
      `Ticket: ${helpdeskTicket.ticketNumber}`,
      `Summary: ${helpdeskTicket.title}`,
      helpdeskTicket.contact ? `Contact: ${helpdeskTicket.contact.firstName} ${helpdeskTicket.contact.lastName}` : null,
      helpdeskTicket.description
    ].filter(Boolean).join("\n")
    : "";

  return (
    <AppShell title="New Booking" userName={userName}>
      {helpdeskTicket ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>Create Booking From Ticket</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p><span className="font-medium text-slate-900">Ticket:</span> {helpdeskTicket.ticketNumber}</p>
            <p><span className="font-medium text-slate-900">Account:</span> {helpdeskTicket.account?.name ?? "No linked account"}</p>
            <p><span className="font-medium text-slate-900">Project:</span> {helpdeskTicket.project?.projectNumber ?? "No linked project"}</p>
            <p><span className="font-medium text-slate-900">Summary:</span> {helpdeskTicket.title}</p>
            {helpdeskTicket.contact ? <p><span className="font-medium text-slate-900">Contact:</span> {helpdeskTicket.contact.firstName} {helpdeskTicket.contact.lastName}</p> : null}
          </CardContent>
        </Card>
      ) : null}
      <JsonActionForm
        endpoint="/api/v1/resource-bookings"
        buttonLabel="Create Booking"
        successHref="/field-services/bookings/:id"
        errorMessage="Unable to create resource booking. Please check dates and resource availability."
        fields={[
          { name: "resourceId", label: "Resource", type: "select", required: true, options: resources.map((resource) => ({ id: resource.id, label: resource.displayName })) },
          { name: "bookingType", label: "Booking type", type: "select", required: true, defaultValue: value("helpdeskTicketId") ? ResourceBookingType.support : undefined, options: Object.values(ResourceBookingType).map((value) => ({ id: value, label: value.replaceAll("_", " ") })) },
          { name: "status", label: "Status", type: "select", options: Object.values(ResourceBookingStatus).map((value) => ({ id: value, label: value.replaceAll("_", " ") })) },
          { name: "title", label: "Title", required: true, defaultValue: derivedTitle },
          { name: "location", label: "Location", defaultValue: derivedLocation },
          { name: "startDate", label: "Start date", type: "date", required: true },
          { name: "endDate", label: "End date", type: "date", required: true },
          { name: "costRate", label: "Cost rate", type: "number" },
          { name: "sellRate", label: "Sell rate", type: "number" },
          { name: "chargeable", label: "Chargeable", type: "checkbox", defaultValue: "true" },
          { name: "overrideConflict", label: "Override conflict", type: "checkbox" },
          { name: "overrideReason", label: "Override reason" },
          { name: "description", label: "Description", type: "textarea", defaultValue: derivedDescription }
        ]}
        fixed={{
          accountId: (helpdeskTicket?.accountId ?? value("accountId")) || undefined,
          projectId: (helpdeskTicket?.projectId ?? value("projectId")) || undefined,
          helpdeskTicketId: helpdeskTicketId || undefined
        }}
      />
    </AppShell>
  );
}
