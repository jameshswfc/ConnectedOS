import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getFinanceDashboard } from "@/modules/finance/finance-service";
import { ModuleMetricCard, formatModuleMoney } from "@/modules/operations/ui/module-ui";

export default async function FinancePage() {
  const { context, userName } = await getCrmPageContext();
  let dashboard: Awaited<ReturnType<typeof getFinanceDashboard>> | null = null;
  try {
    dashboard = await getFinanceDashboard(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!dashboard) return <AppShell title="Finance" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Finance" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href="/finance/invoices"><Button variant="secondary">Invoices</Button></Link>
        <Link href="/finance/billing-schedules"><Button variant="secondary">Billing Schedules</Button></Link>
        <Link href="/finance/invoices/new"><Button>Create Invoice</Button></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <ModuleMetricCard title="Invoiced" value={formatModuleMoney(dashboard.totalInvoiced)} />
        <ModuleMetricCard title="Collected" value={formatModuleMoney(dashboard.totalCollected)} />
        <ModuleMetricCard title="Outstanding" value={formatModuleMoney(dashboard.outstanding)} />
        <ModuleMetricCard title="Overdue invoices" value={dashboard.overdue} />
        <ModuleMetricCard title="Approved expenses" value={formatModuleMoney(dashboard.approvedExpensesAwaitingPayment)} />
      </div>
    </AppShell>
  );
}
