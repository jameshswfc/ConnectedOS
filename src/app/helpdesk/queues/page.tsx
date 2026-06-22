import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listHelpdeskQueues } from "@/modules/helpdesk/helpdesk-service";

export default async function HelpdeskQueuesPage() {
  const { context, userName } = await getCrmPageContext();
  let queues: Awaited<ReturnType<typeof listHelpdeskQueues>> | null = null;
  try {
    queues = await listHelpdeskQueues(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!queues) return <AppShell title="Helpdesk Queues" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Helpdesk Queues" userName={userName}>
      <Card>
        <CardHeader><CardTitle>Create Queue</CardTitle></CardHeader>
        <CardContent>
          <JsonActionForm endpoint="/api/v1/helpdesk/queues" buttonLabel="Create Queue" fields={[{ name: "name", label: "Queue name", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "active", label: "Active", type: "checkbox", defaultValue: "true" }]} />
        </CardContent>
      </Card>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Active</TableHead></TableRow></TableHeader><TableBody>
          {queues.map((queue) => <TableRow key={queue.id}><TableCell>{queue.name}</TableCell><TableCell>{queue.description ?? "-"}</TableCell><TableCell>{queue.active ? "Yes" : "No"}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
