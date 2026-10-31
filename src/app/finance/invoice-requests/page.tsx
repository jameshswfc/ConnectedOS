import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { AccessDenied } from "@/components/auth/access-denied";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { labelFromValue } from "@/modules/crm/ui/crm-format";
import { invoiceRequestVisibility } from "@/modules/finance/invoice-request-service";

export default async function InvoiceRequestsPage() {
  const { context, userName } = await getCrmPageContext();
  let where; try { where = invoiceRequestVisibility(context); } catch { return <AppShell title="Invoice requests" userName={userName}><AccessDenied /></AppShell>; }
  const requests = await prisma.projectInvoiceRequest.findMany({ where, include: { project: { select: { projectNumber: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <AppShell title="Invoice requests" userName={userName}>
    <div className="overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Project", "Completed work", "Total (GBP)", "Status", "Sage invoice"].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{requests.map((r) => <tr key={r.id} className="border-t"><td className="p-3"><Link href={`/finance/invoice-requests/${r.id}`} className="text-brand-700 underline">{r.project.projectNumber} {r.project.name}</Link></td><td className="p-3">{r.triggerLabel}</td><td className="p-3">{r.totalAmount.toFixed(2)}</td><td className="p-3">{labelFromValue(r.status)}</td><td className="p-3">{r.sageInvoiceNumber || "Not created"}</td></tr>)}{!requests.length ? <tr><td colSpan={5} className="p-8 text-center text-slate-600">No invoice requests.</td></tr> : null}</tbody></table></div>
    {requests.length === 100 ? <p className="mt-3 text-sm text-slate-600">Showing the latest 100 visible requests.</p> : null}
  </AppShell>;
}
