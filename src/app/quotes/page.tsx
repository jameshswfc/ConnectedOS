import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { canSelectSalesperson, getActiveSalesUsers, resolveSalespersonScope } from "@/modules/crm/sales/salesperson-service";
import { SalespersonFilter } from "@/modules/crm/sales/salesperson-filter";
import { listQuotes } from "@/modules/quoting/quotes/quote-service";
import { formatQuoteMoney, labelFromQuoteValue } from "@/modules/quoting/ui/quote-format";
import { QuoteStatusBadge } from "@/modules/quoting/ui/quote-status-badge";

type PageProps = { searchParams?: Promise<{ search?: string; status?: string; salespersonId?: string; my?: string }> };

const quoteStatusTabs = ["draft", "internal_review", "approved", "sent", "accepted", "declined", "expired"] as const;

export default async function QuotesPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const salespersonScope = resolveSalespersonScope(context, resolvedSearchParams?.salespersonId);
  const [allQuotes, salespeople] = await Promise.all([
    listQuotes(context, { search: resolvedSearchParams?.search, salespersonId: salespersonScope.selectedSalespersonId, myQuotes: resolvedSearchParams?.my === "1" }),
    canSelectSalesperson(context) ? getActiveSalesUsers() : Promise.resolve([])
  ]);
  const activeStatus = quoteStatusTabs.includes(resolvedSearchParams?.status as (typeof quoteStatusTabs)[number]) ? resolvedSearchParams?.status : "internal_review";
  const quotes = allQuotes.filter((quote) => quote.status === activeStatus);
  const counts = quoteStatusTabs.reduce<Record<string, number>>((totals, status) => {
    totals[status] = allQuotes.filter((quote) => quote.status === status).length;
    return totals;
  }, {});
  return (
    <AppShell title="Quotes" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <form className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <input name="search" defaultValue={resolvedSearchParams?.search} placeholder="Search quotes" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <input type="hidden" name="status" value={activeStatus} />
            <input type="hidden" name="salespersonId" value={salespersonScope.selectedSalespersonId ?? ""} />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          {salespersonScope.canSelect ? <SalespersonFilter salespeople={salespeople} selectedSalespersonId={salespersonScope.selectedSalespersonId} hiddenFields={{ search: resolvedSearchParams?.search, status: activeStatus }} /> : null}
          <Link href={`/quotes?status=${activeStatus}&my=1`}><Button variant={resolvedSearchParams?.my === "1" ? "primary" : "secondary"}>My Quotes</Button></Link>
        </div>
        <Link href="/quotes/new"><Button>Create Quote</Button></Link>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {quoteStatusTabs.map((status) => (
          <Link key={status} href={`/quotes?status=${status}${resolvedSearchParams?.search ? `&search=${encodeURIComponent(resolvedSearchParams.search)}` : ""}`} className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium ${activeStatus === status ? "border-brand-700 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-700"}`}>
            {labelFromQuoteValue(status)} ({counts[status] ?? 0})
          </Link>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><Table><TableHeader><TableRow><TableHead>Quote Number</TableHead><TableHead>Account</TableHead><TableHead>Opportunity</TableHead><TableHead>Value</TableHead><TableHead>Created Date</TableHead><TableHead>Last Updated</TableHead><TableHead>Owner</TableHead><TableHead>Salesperson</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{quotes.map((quote) => <TableRow key={quote.id}><TableCell><Link href={`/quotes/${quote.id}`} className="font-medium text-brand-700">{quote.quoteNumber}</Link></TableCell><TableCell>{quote.account.name}</TableCell><TableCell>{quote.opportunity?.opportunityName ?? "-"}</TableCell><TableCell>{formatQuoteMoney(quote.sellTotal)}</TableCell><TableCell>{quote.createdAt.toLocaleDateString("en-GB")}</TableCell><TableCell>{quote.updatedAt.toLocaleDateString("en-GB")}</TableCell><TableCell>{quote.owner.displayName}</TableCell><TableCell>{quote.owner.displayName}</TableCell><TableCell><QuoteStatusBadge status={quote.status} /></TableCell></TableRow>)}</TableBody></Table></div>
    </AppShell>
  );
}
