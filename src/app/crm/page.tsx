import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmDashboardStarter } from "@/modules/crm/dashboard/dashboard-service";
import type { OpportunityHealthStatus } from "@/modules/crm/opportunities/opportunity-health";
import { canSelectSalesperson, getActiveSalesUsers, resolveSalespersonScope } from "@/modules/crm/sales/salesperson-service";
import { SalespersonFilter } from "@/modules/crm/sales/salesperson-filter";
import { formatDate, formatMoney } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { searchParams?: Promise<{ salespersonId?: string; health?: string | string[] }> };

export default async function CrmDashboardPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const salespersonScope = resolveSalespersonScope(context, resolvedSearchParams?.salespersonId);
  const [dashboard, salespeople] = await Promise.all([
    getCrmDashboardStarter(context, salespersonScope.selectedSalespersonId, parseHealthFilters(resolvedSearchParams?.health)),
    canSelectSalesperson(context) ? getActiveSalesUsers() : Promise.resolve([])
  ]);

  return (
    <AppShell title="CRM Dashboard" userName={userName}>
      {salespersonScope.canSelect ? <div className="mb-5"><SalespersonFilter salespeople={salespeople} selectedSalespersonId={salespersonScope.selectedSalespersonId} /></div> : null}
      <div className="mb-5"><HealthFilter selected={parseHealthFilters(resolvedSearchParams?.health)} /></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Open Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(dashboard.total_pipeline_value)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weighted Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(dashboard.weighted_pipeline_value)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Closing This Month</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.closing_this_month}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Closing Next Month</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.closing_next_month}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open Pre-Sales Requests</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.open_presales_requests}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quotes Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.quotes_awaiting_approval}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-red-700">{dashboard.overdue_opportunities}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Opportunities Requiring Attention</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-700">{dashboard.opportunities_requiring_attention}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Due Activities</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.due_activities.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue Activities</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-red-700">{dashboard.overdue_activities.length}</CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          ["Accounts", "/crm/accounts"],
          ["Contacts", "/crm/contacts"],
          ["Leads", "/crm/leads"],
          ["Opportunities", "/crm/opportunities"],
          ["My Work", "/crm/my-work"],
          ["Pipeline", "/crm/pipeline"],
          ["Forecast", "/crm/forecast"],
          ["Activities", "/crm/activities"]
        ].map(([label, href]) => (
          <Link key={href} href={href} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.opportunities_by_stage.map((stage) => (
              <div key={stage.stage} className="grid gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm md:grid-cols-[1fr_80px_120px_120px]">
                <span className="font-medium text-slate-900">{stage.label}</span>
                <span>{stage.count} deals</span>
                <span>{formatMoney(stage.unweightedValue)}</span>
                <span>{formatMoney(stage.weightedValue)} weighted</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <ActivityAlertCard title="Due Today" activities={dashboard.due_activities} />
          <ActivityAlertCard title="Overdue" activities={dashboard.overdue_activities} />
        </div>
      </div>
    </AppShell>
  );
}

function parseHealthFilters(value?: string | string[]): OpportunityHealthStatus[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.filter((item): item is OpportunityHealthStatus => ["green", "amber", "red"].includes(item));
}

function HealthFilter({ selected }: { selected: OpportunityHealthStatus[] }) {
  return (
    <form className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
      {(["green", "amber", "red"] as const).map((health) => (
        <label key={health} className="flex items-center gap-1 font-medium text-slate-700">
          <input type="checkbox" name="health" value={health} defaultChecked={selected.includes(health)} />
          Show {health.charAt(0).toUpperCase() + health.slice(1)}
        </label>
      ))}
      <button type="submit" className="h-10 rounded-md border border-brand-100 bg-white px-4 text-sm font-medium text-brand-900 hover:border-gold-500 hover:bg-gold-50">Filter Health</button>
    </form>
  );
}

type ActivityAlert = {
  id: string;
  subject: string;
  dueDate: Date | null;
  account: { name: string } | null;
  opportunity: { opportunityName: string } | null;
  lead: { accountName: string | null; contactName: string | null; email: string | null } | null;
};

function ActivityAlertCard({ title, activities }: { title: string; activities: ActivityAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {activities.length > 0 ? activities.map((activity) => (
          <Link key={activity.id} href={`/crm/activities/${activity.id}`} className="block rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">
            <span className="block font-medium text-brand-700">{activity.subject}</span>
            <span className="block text-slate-500">{activity.account?.name ?? activity.opportunity?.opportunityName ?? activity.lead?.accountName ?? activity.lead?.contactName ?? activity.lead?.email ?? "CRM activity"}</span>
            <span className="block text-slate-500">{formatDate(activity.dueDate)}</span>
          </Link>
        )) : (
          <p className="text-slate-500">No activities.</p>
        )}
      </CardContent>
    </Card>
  );
}
