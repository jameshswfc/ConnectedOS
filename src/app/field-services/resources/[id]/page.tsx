import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getResource } from "@/modules/field-services/field-services-service";
import { ResourceDeleteButton } from "@/modules/field-services/ui/resource-delete-button";
import { ResourceNotFoundCard } from "@/modules/field-services/ui/resource-not-found-card";

type Params = { params: Promise<{ id: string }> };
export default async function ResourceDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let resource: Awaited<ReturnType<typeof getResource>> | null = null;
  let notFound = false;
  try {
    resource = await getResource(context, id);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      notFound = true;
    } else if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) {
      throw error;
    }
  }

  if (notFound) {
    return <AppShell title="Resource" userName={userName}><ResourceNotFoundCard /></AppShell>;
  }

  if (!resource) {
    return <AppShell title="Resource" userName={userName}><AccessDenied /></AppShell>;
  }

  return (
    <AppShell title={resource.displayName} userName={userName}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/field-services/resources/${resource.id}/edit`}><Button>Edit Resource</Button></Link>
        <ResourceDeleteButton resourceId={resource.id} />
      </div>
      <Card><CardHeader><CardTitle>Resource Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Type: {resource.resourceType.replaceAll("_", " ")}</p><p>Linked user: {resource.user?.displayName ?? "-"}</p><p>Company: {resource.companyName ?? "-"}</p><p>Role type: {resource.roleType ?? "-"}</p><p>Email: {resource.email ?? "-"}</p><p>Phone: {resource.phone ?? "-"}</p><p>Address: {resource.address ?? "-"}</p><p>Skills: {resource.skillTags.join(", ") || "-"}</p><p>Agent: {resource.agentName ?? "-"}</p><p>Agent phone: {resource.agentPhone ?? "-"}</p><p>Agent email: {resource.agentEmail ?? "-"}</p><p>Standard day cost / sell: {resource.standardDayCost.toString()} / {resource.standardDaySell.toString()}</p><p>Half day cost / sell: {resource.halfDayCost.toString()} / {resource.halfDaySell.toString()}</p><p>Hourly cost / sell: {resource.hourlyCost.toString()} / {resource.hourlySell.toString()}</p><p>Active: {resource.active ? "Yes" : "No"}</p><p>Notes: {resource.notes ?? "-"}</p></CardContent></Card>
      <Card className="mt-4"><CardHeader><CardTitle>Bookings</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Status</TableHead><TableHead>Conflict</TableHead></TableRow></TableHeader><TableBody>{resource.bookings.map((booking) => <TableRow key={booking.id}><TableCell>{booking.title}</TableCell><TableCell>{booking.bookingType.replaceAll("_", " ")}</TableCell><TableCell>{booking.startDate.toISOString().slice(0, 10)} - {booking.endDate.toISOString().slice(0, 10)}</TableCell><TableCell>{booking.status.replaceAll("_", " ")}</TableCell><TableCell>{booking.conflictStatus.replaceAll("_", " ")}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </AppShell>
  );
}
