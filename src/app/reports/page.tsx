import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getExecutiveReport } from "@/modules/reporting/reporting-service";
import { ModuleMetricCard, formatModuleMoney } from "@/modules/operations/ui/module-ui";

export default async function ReportsPage() {
  const { context, userName } = await getCrmPageContext();
  let report: Awaited<ReturnType<typeof getExecutiveReport>> | null = null;
  try {
    report = await getExecutiveReport(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!report) return <AppShell title="Reports" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Reports" userName={userName}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/reports/sales"><Button variant="secondary">Sales</Button></Link>
        <Link href="/reports/projects"><Button variant="secondary">Projects</Button></Link>
        <Link href="/reports/resources"><Button variant="secondary">Resources</Button></Link>
        <Link href="/reports/finance"><Button variant="secondary">Finance</Button></Link>
        <Link href="/reports/procurement"><Button variant="secondary">Procurement</Button></Link>
        <Link href="/reports/helpdesk"><Button variant="secondary">Helpdesk</Button></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <ModuleMetricCard title="Pipeline" value={formatModuleMoney(report.sales.pipelineValue)} />
        <ModuleMetricCard title="Projects" value={report.projects.projects.length} />
        <ModuleMetricCard title="Open pre-sales" value={report.presales.openRequests} />
        <ModuleMetricCard title="Outstanding billing" value={formatModuleMoney(report.finance.outstanding)} />
        <ModuleMetricCard title="Open POs" value={report.procurement.openPurchaseOrders} />
        <ModuleMetricCard title="Open tickets" value={report.helpdesk.openTickets} />
      </div>
    </AppShell>
  );
}
