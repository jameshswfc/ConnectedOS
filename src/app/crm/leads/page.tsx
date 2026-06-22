import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { CrmCreateForm, leadStatusOptions } from "@/modules/crm/ui/crm-client-forms";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listLeads } from "@/modules/crm/leads/lead-service";
import { canSelectSalesperson, getActiveSalesUsers, resolveSalespersonScope } from "@/modules/crm/sales/salesperson-service";
import { SalespersonFilter } from "@/modules/crm/sales/salesperson-filter";
import { formatDate, formatMoney, labelFromValue } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { searchParams?: Promise<{ search?: string; salespersonId?: string }> };

export default async function LeadsPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const salespersonScope = resolveSalespersonScope(context, resolvedSearchParams?.salespersonId);
  const [leads, salespeople] = await Promise.all([
    listLeads(context, { search: resolvedSearchParams?.search, salespersonId: salespersonScope.selectedSalespersonId }),
    canSelectSalesperson(context) ? getActiveSalesUsers() : Promise.resolve([])
  ]);
  const canAssign = canSelectSalesperson(context);
  return (
    <AppShell title="Leads" userName={userName}>
      <div className="mb-4 flex flex-wrap gap-3">
        <form className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <input name="search" defaultValue={resolvedSearchParams?.search} placeholder="Search leads" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <input type="hidden" name="salespersonId" value={salespersonScope.selectedSalespersonId ?? ""} />
          <button type="submit" className="h-10 rounded-md border border-brand-100 bg-white px-4 text-sm font-medium text-brand-900 hover:border-gold-500 hover:bg-gold-50">Search</button>
        </form>
        {canAssign ? <SalespersonFilter salespeople={salespeople} selectedSalespersonId={salespersonScope.selectedSalespersonId} hiddenFields={{ search: resolvedSearchParams?.search }} /> : null}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead>Salesperson</TableHead><TableHead>Value</TableHead><TableHead>Next Action</TableHead></TableRow></TableHeader><TableBody>{leads.map((lead) => <TableRow key={lead.id}><TableCell><Link href={`/crm/leads/${lead.id}`} className="font-medium text-brand-700">{lead.accountName ?? "Lead"}</Link></TableCell><TableCell>{lead.contactName ?? lead.email ?? "-"}</TableCell><TableCell>{labelFromValue(lead.status)}</TableCell><TableCell>{lead.owner.displayName}</TableCell><TableCell>{formatMoney(lead.estimatedValue)}</TableCell><TableCell>{formatDate(lead.nextActionDate)}</TableCell></TableRow>)}</TableBody></Table></div>
        <CrmCreateForm action="/api/v1/leads" redirectTo="/crm/leads" submitLabel="Create Lead" fields={[
          ...(canAssign ? [{ name: "ownerId", label: "Salesperson", type: "select" as const, required: true, options: salespeople.map((salesperson) => ({ value: salesperson.id, label: `${salesperson.displayName} (${salesperson.email})` })) }] : []),
          { name: "accountName", label: "Account name" },
          { name: "contactName", label: "Contact name" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone" },
          { name: "source", label: "Source" },
          { name: "status", label: "Status", type: "select", options: leadStatusOptions },
          { name: "estimatedValue", label: "Estimated value", type: "number" },
          { name: "nextActionDate", label: "Next action date", type: "date" }
        ]} />
      </div>
    </AppShell>
  );
}
