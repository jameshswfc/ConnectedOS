import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getHelpdeskDashboard } from "@/modules/helpdesk/helpdesk-service";
import { ModuleMetricCard } from "@/modules/operations/ui/module-ui";

export default async function HelpdeskPage() {
  const { context, userName } = await getCrmPageContext();
  let dashboard: Awaited<ReturnType<typeof getHelpdeskDashboard>> | null = null;
  try {
    dashboard = await getHelpdeskDashboard(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!dashboard) return <AppShell title="Helpdesk" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Helpdesk" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Link href="/helpdesk/tickets"><Button variant="secondary">Tickets</Button></Link>
          <Link href="/helpdesk/queues"><Button variant="secondary">Queues</Button></Link>
          <Link href="/helpdesk/knowledge-base"><Button variant="secondary">Knowledge Base</Button></Link>
        </div>
        <Link href="/helpdesk/tickets/new"><Button>New Ticket</Button></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <ModuleMetricCard title="Open Tickets" value={dashboard.openTickets} />
        <ModuleMetricCard title="SLA Breaches" value={dashboard.breaches} />
        <ModuleMetricCard title="Avg First Response (mins)" value={dashboard.averageFirstResponseMinutes} />
        <ModuleMetricCard title="Avg Resolution (mins)" value={dashboard.averageResolutionMinutes} />
      </div>
    </AppShell>
  );
}
