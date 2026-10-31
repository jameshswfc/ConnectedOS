import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { AccessDenied } from "@/components/auth/access-denied";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { labelFromValue } from "@/modules/crm/ui/crm-format";
import { getSageOverview } from "@/services/integrations/sage/sage-service";
import { canReadSage, canManageSage, sageConfigured, sageInvoiceCreationEnabled } from "@/services/integrations/sage/sage-security";
import { SageActions } from "@/modules/finance/ui/sage-actions";

export default async function SagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { context, userName } = await getCrmPageContext();
  if (!canReadSage(context)) return <AppShell title="Sage Accounting" userName={userName}><AccessDenied /></AppShell>;
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const page = typeof params.page === "string" && /^\d{1,5}$/.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const configured = sageConfigured();
  const data = configured ? await getSageOverview(context, query, page) : null;
  const money = (value: unknown, currency: string) => new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(value ?? 0));
  const today = new Date().toISOString().slice(0, 10);
  return <AppShell title="Sage Accounting" userName={userName}>
    <div className="mb-5 border-b border-slate-200 pb-5"><p className="mb-3 text-sm text-slate-600">Read-only sales invoices from Sage. Kept separate from ConnectedOS billing; Sage remains the accounting source of truth.</p>
      {!configured ? <p className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Not connected. Sage application registration, secure server configuration and administrator consent are required.</p> : <SageActions connected={Boolean(data?.connection)} manage={canManageSage(context)} writeEnabled={sageInvoiceCreationEnabled()} />}
      {data?.connection ? <p className="mt-3 text-sm text-slate-600">Last successful refresh: {data.connection.lastSyncedAt?.toLocaleString("en-GB", { timeZone: "Europe/London" }) ?? "Not yet refreshed"}</p> : null}
      {data?.connection?.lastError ? <p role="alert" className="mt-2 text-sm text-red-700">{data.connection.lastError}</p> : null}
    </div>
    {data ? <>
      <div className="mb-6 flex flex-wrap gap-8">{data.totals.map((total) => <section key={total.currency}><h2 className="text-sm text-slate-500">{total.currency} invoices, excluding draft / void</h2><p className="text-xl font-semibold text-brand-900">{money(total._sum.outstandingAmount, total.currency)} outstanding</p><p className="text-sm text-slate-600">{money(total._sum.totalAmount, total.currency)} invoice total · {total._count} invoices</p></section>)}</div>
      <form className="mb-4 flex gap-2"><label className="sr-only" htmlFor="sage-search">Search invoices or customers</label><input id="sage-search" name="q" defaultValue={query} placeholder="Invoice number or customer" className="min-w-0 rounded border border-slate-300 p-2" /><button className="rounded bg-brand-700 px-4 py-2 text-white">Search</button></form>
      <div className="overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[740px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Invoice", "Customer", "Status", "Date", "Due", "Total", "Outstanding"].map((label) => <th className="p-3 font-medium" key={label}>{label}</th>)}</tr></thead><tbody>{data.invoices.map((invoice) => <tr key={invoice.id} className="border-t border-slate-100"><td className="p-3 font-medium">{invoice.invoiceNumber}</td><td className="p-3">{invoice.customerName}</td><td className="p-3">{labelFromValue(invoice.status.toLowerCase())}</td><td className="p-3">{invoice.invoiceDate.toLocaleDateString("en-GB", { timeZone: "UTC" })}</td><td className="p-3">{invoice.dueDate?.toLocaleDateString("en-GB", { timeZone: "UTC" }) ?? "Not set"}</td><td className="p-3">{money(invoice.totalAmount, invoice.currency)}</td><td className={`p-3 ${invoice.dueDate && invoice.dueDate.toISOString().slice(0, 10) < today && Number(invoice.outstandingAmount) > 0 && !["DRAFT", "VOID"].includes(invoice.status) ? "font-semibold text-red-700" : ""}`}>{money(invoice.outstandingAmount, invoice.currency)}</td></tr>)}{!data.invoices.length ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">No imported invoices match this view.</td></tr> : null}</tbody></table></div>
      <nav aria-label="Invoice pages" className="mt-4 flex gap-4 text-sm text-brand-700">{page > 1 ? <Link href={`?${new URLSearchParams({ q: query, page: String(page - 1) })}`}>Previous</Link> : null}<span>{data.count} invoices</span>{page * 50 < data.count ? <Link href={`?${new URLSearchParams({ q: query, page: String(page + 1) })}`}>Next</Link> : null}</nav>
    </> : null}
  </AppShell>;
}
