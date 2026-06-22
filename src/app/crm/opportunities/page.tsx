import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOpportunities } from "@/modules/crm/opportunities/opportunity-service";
import { getStageLabel } from "@/modules/crm/opportunities/opportunity-stages";
import { OpportunityHealthBadge } from "@/modules/crm/ui/opportunity-health-badge";
import type { OpportunityHealthStatus } from "@/modules/crm/opportunities/opportunity-health";
import { canSelectSalesperson, getActiveSalesUsers, resolveSalespersonScope } from "@/modules/crm/sales/salesperson-service";
import { SalespersonFilter } from "@/modules/crm/sales/salesperson-filter";
import { formatDate, formatMoney } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { searchParams?: Promise<{ search?: string; salespersonId?: string; health?: string | string[] }> };

export default async function OpportunitiesPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const salespersonScope = resolveSalespersonScope(context, resolvedSearchParams?.salespersonId);
  const [opportunities, salespeople] = await Promise.all([
    listOpportunities(context, { search: resolvedSearchParams?.search, salespersonId: salespersonScope.selectedSalespersonId, health: parseHealthFilters(resolvedSearchParams?.health) }),
    canSelectSalesperson(context) ? getActiveSalesUsers() : Promise.resolve([])
  ]);
  return (
    <AppShell title="Opportunities" userName={userName}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <form className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <input name="search" defaultValue={resolvedSearchParams?.search} placeholder="Search opportunities" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <input type="hidden" name="salespersonId" value={salespersonScope.selectedSalespersonId ?? ""} />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          {salespersonScope.canSelect ? <SalespersonFilter salespeople={salespeople} selectedSalespersonId={salespersonScope.selectedSalespersonId} hiddenFields={{ search: resolvedSearchParams?.search }} /> : null}
          <HealthFilter selected={parseHealthFilters(resolvedSearchParams?.health)} />
        </div>
        <Link href="/crm/opportunities/new"><Button>Create Opportunity</Button></Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><Table><TableHeader><TableRow><TableHead>Opportunity</TableHead><TableHead>Account</TableHead><TableHead>Stage</TableHead><TableHead>Health</TableHead><TableHead>Salesperson</TableHead><TableHead>Value</TableHead><TableHead>Probability</TableHead><TableHead>Next Action</TableHead><TableHead>Close Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{opportunities.map((opportunity) => <TableRow key={opportunity.id}><TableCell><Link href={`/crm/opportunities/${opportunity.id}`} className="font-medium text-brand-700">{opportunity.opportunityName}</Link></TableCell><TableCell>{opportunity.account.name}</TableCell><TableCell>{getStageLabel(opportunity.stage)}</TableCell><TableCell><OpportunityHealthBadge status={opportunity.healthStatus} /></TableCell><TableCell>{opportunity.owner.displayName}</TableCell><TableCell>{formatMoney(opportunity.value)}</TableCell><TableCell>{opportunity.probabilityPercent}%</TableCell><TableCell>{formatDate(opportunity.nextActionDate)}</TableCell><TableCell>{formatDate(opportunity.expectedCloseDate)}</TableCell><TableCell><Link href={`/crm/opportunities/${opportunity.id}/edit`} className="text-sm font-medium text-brand-700">Edit</Link></TableCell></TableRow>)}</TableBody></Table></div>
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
      <Button type="submit" variant="secondary">Filter Health</Button>
    </form>
  );
}
