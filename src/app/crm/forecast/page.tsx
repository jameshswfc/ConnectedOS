import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getForecast } from "@/modules/crm/pipeline/pipeline-service";
import type { OpportunityHealthStatus } from "@/modules/crm/opportunities/opportunity-health";
import { canSelectSalesperson, getActiveSalesUsers, resolveSalespersonScope } from "@/modules/crm/sales/salesperson-service";
import { SalespersonFilter } from "@/modules/crm/sales/salesperson-filter";
import { formatDate, formatMoney } from "@/modules/crm/ui/crm-format";
import { OpportunityHealthBadge } from "@/modules/crm/ui/opportunity-health-badge";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { searchParams?: Promise<{ salespersonId?: string; health?: string | string[] }> };

export default async function CrmForecastPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const salespersonScope = resolveSalespersonScope(context, resolvedSearchParams?.salespersonId);
  const [forecastMonths, salespeople] = await Promise.all([
    getForecast(context, salespersonScope.selectedSalespersonId, parseHealthFilters(resolvedSearchParams?.health)),
    canSelectSalesperson(context) ? getActiveSalesUsers() : Promise.resolve([])
  ]);

  return (
    <AppShell title="CRM Forecast" userName={userName}>
      <div className="space-y-5">
        {salespersonScope.canSelect ? <SalespersonFilter salespeople={salespeople} selectedSalespersonId={salespersonScope.selectedSalespersonId} /> : null}
        <HealthFilter selected={parseHealthFilters(resolvedSearchParams?.health)} />
        {forecastMonths.length > 0 ? forecastMonths.map((month) => (
          <Card key={month.key}>
            <CardHeader>
              <CardTitle>{month.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <Metric label="Deals" value={month.dealCount.toString()} />
                <Metric label="Unweighted" value={formatMoney(month.unweightedValue)} />
                <Metric label="Weighted" value={formatMoney(month.weightedValue)} />
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Weighted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {month.deals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell><Link href={`/crm/opportunities/${deal.id}`} className="font-medium text-brand-700">{deal.opportunityName}</Link></TableCell>
                        <TableCell>{deal.accountName}</TableCell>
                        <TableCell>{deal.ownerName}</TableCell>
                        <TableCell>{formatDate(deal.expectedCloseDate)}</TableCell>
                        <TableCell><OpportunityHealthBadge status={deal.healthStatus} /></TableCell>
                        <TableCell>{formatMoney(deal.value)}</TableCell>
                        <TableCell>{formatMoney(deal.weightedValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card>
            <CardContent className="py-8 text-sm text-slate-500">No open opportunities with expected close dates.</CardContent>
          </Card>
        )}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
