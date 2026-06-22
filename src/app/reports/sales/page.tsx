import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getSalesReport } from "@/modules/reporting/reporting-service";
import { ModuleMetricCard, formatModuleMoney } from "@/modules/operations/ui/module-ui";

export default async function SalesReportsPage() {
  const { context, userName } = await getCrmPageContext();
  let report: Awaited<ReturnType<typeof getSalesReport>> | null = null;
  try {
    report = await getSalesReport(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!report) return <AppShell title="Sales Reports" userName={userName}><AccessDenied /></AppShell>;
  return <AppShell title="Sales Reports" userName={userName}><div className="grid gap-4 md:grid-cols-3"><ModuleMetricCard title="Pipeline" value={formatModuleMoney(report.pipelineValue)} /><ModuleMetricCard title="Weighted Pipeline" value={formatModuleMoney(report.weightedPipeline)} /><ModuleMetricCard title="Win Rate" value={`${report.winRate}%`} /><ModuleMetricCard title="Quotes Awaiting Approval" value={report.quotesAwaitingApproval} /><ModuleMetricCard title="Sent Quotes" value={report.sentQuotes} /><ModuleMetricCard title="Accepted Quotes" value={report.acceptedQuotes} /></div></AppShell>;
}
