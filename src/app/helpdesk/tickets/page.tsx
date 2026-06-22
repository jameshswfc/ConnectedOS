import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { type HelpdeskTicketListView, listHelpdeskTickets } from "@/modules/helpdesk/helpdesk-service";
import { ModuleStatusBadge, formatModuleDate, formatModuleLabel } from "@/modules/operations/ui/module-ui";

type PageProps = {
  searchParams?: Promise<{ view?: string }>;
};

const helpdeskViews: Array<{ value: HelpdeskTicketListView; label: string }> = [
  { value: "active", label: "Active" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" }
];

export default async function HelpdeskTicketsPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const params = await searchParams;
  const activeView = helpdeskViews.some((view) => view.value === params?.view) ? params?.view as HelpdeskTicketListView : "active";
  let tickets: Awaited<ReturnType<typeof listHelpdeskTickets>> | null = null;
  try {
    tickets = await listHelpdeskTickets(context, { view: activeView });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!tickets) return <AppShell title="Helpdesk Tickets" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Helpdesk Tickets" userName={userName}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {helpdeskViews.map((view) => (
            <Link key={view.value} href={`/helpdesk/tickets?view=${view.value}`}>
              <Button variant={activeView === view.value ? "primary" : "secondary"}>{view.label}</Button>
            </Link>
          ))}
        </div>
        <Link href="/helpdesk/tickets/new"><Button>Create Ticket</Button></Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>Account</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Assigned</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>
          {tickets.map((ticket) => <TableRow key={ticket.id}><TableCell><Link href={`/helpdesk/tickets/${ticket.id}`} className="font-medium text-brand-700">{ticket.ticketNumber}<br /><span className="text-slate-700">{ticket.title}</span></Link></TableCell><TableCell>{ticket.account?.name ?? "-"}</TableCell><TableCell>{formatModuleLabel(ticket.priority)}</TableCell><TableCell><ModuleStatusBadge value={ticket.status} /></TableCell><TableCell>{ticket.assignedTo?.displayName ?? "-"}</TableCell><TableCell>{formatModuleDate(ticket.createdAt)}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
