import { AppShell } from "@/components/layout/app-shell";
import { PipelineBoardClient } from "@/modules/crm/pipeline/pipeline-board-client";
import { getPipelineBoard } from "@/modules/crm/pipeline/pipeline-service";
import type { OpportunityHealthStatus } from "@/modules/crm/opportunities/opportunity-health";
import { canSelectSalesperson, getActiveSalesUsers, resolveSalespersonScope } from "@/modules/crm/sales/salesperson-service";
import { SalespersonFilter } from "@/modules/crm/sales/salesperson-filter";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { searchParams?: Promise<{ salespersonId?: string; health?: string | string[] }> };

export default async function CrmPipelinePage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const salespersonScope = resolveSalespersonScope(context, resolvedSearchParams?.salespersonId);
  const [columns, salespeople] = await Promise.all([
    getPipelineBoard(context, salespersonScope.selectedSalespersonId, parseHealthFilters(resolvedSearchParams?.health)),
    canSelectSalesperson(context) ? getActiveSalesUsers() : Promise.resolve([])
  ]);

  return (
    <AppShell title="CRM Pipeline" userName={userName}>
      <div className="space-y-4">
        {salespersonScope.canSelect ? <SalespersonFilter salespeople={salespeople} selectedSalespersonId={salespersonScope.selectedSalespersonId} /> : null}
        <HealthFilter selected={parseHealthFilters(resolvedSearchParams?.health)} />
        <PipelineBoardClient
          initialColumns={columns.map((column) => ({
            ...column,
            opportunities: column.opportunities.map((opportunity) => ({
              ...opportunity,
              expectedCloseDate: opportunity.expectedCloseDate?.toISOString() ?? null,
              nextActivityDate: opportunity.nextActivityDate?.toISOString() ?? null
            }))
          }))}
        />
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
