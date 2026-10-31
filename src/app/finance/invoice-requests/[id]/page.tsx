import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AccessDenied } from "@/components/auth/access-denied";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { labelFromValue } from "@/modules/crm/ui/crm-format";
import { getInvoiceRequest, isInvoiceApprover } from "@/modules/finance/invoice-request-service";
import { sageConfigured, sageInvoiceCreationEnabled } from "@/services/integrations/sage/sage-security";
import { InvoiceApprovalForm } from "@/modules/finance/ui/invoice-request-form";

export default async function InvoiceRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { context, userName } = await getCrmPageContext();
  const id = z.string().uuid().safeParse((await params).id); if (!id.success) notFound();
  let r;
  try { r = await getInvoiceRequest(context, id.data); } catch (e) { if (e instanceof Error && e.message.startsWith("Missing permission")) return <AppShell title="Invoice request" userName={userName}><AccessDenied /></AppShell>; throw e; }
  const fields = [["Project", `${r.project.projectNumber} · ${r.project.name}`], ["Customer", r.project.account.name], ["Completed work", r.triggerLabel], ["Description", r.description], ["Net amount", `GBP ${r.netAmount.toFixed(2)}`], ["VAT", `${r.taxRate.toString()}% · GBP ${r.taxAmount.toFixed(2)}`], ["Total", `GBP ${r.totalAmount.toFixed(2)}`], ["Status", labelFromValue(r.status)], ["Requested by", r.requestedBy.displayName], ["Approver", r.approver.displayName], ["Sage customer", r.sageContactName || "Awaiting review"], ["Sage invoice", r.sageInvoiceNumber || "Not created"], ["Reconciliation reference", `COS-${r.id}`]];
  return <AppShell title="Invoice request" userName={userName}><div className="mb-5 flex gap-4 text-sm"><Link href="/finance/invoice-requests" className="text-brand-700 underline">All requests</Link><Link href={`/projects/${r.projectId}`} className="text-brand-700 underline">Open project</Link></div><dl className="grid max-w-3xl gap-x-8 gap-y-3 sm:grid-cols-[180px_1fr]">{fields.map(([label, value]) => <div key={label} className="contents"><dt className="text-sm text-slate-500">{label}</dt><dd className="break-words text-sm text-slate-900">{value}</dd></div>)}</dl>
    {r.lastError || r.status === "creating" ? <p role="alert" className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{r.lastError || "Invoice creation is in progress or awaiting confirmation. Do not create another invoice. Check Sage using the reconciliation reference if this status persists."}</p> : null}
    {r.rejectionReason ? <p className="mt-5 text-sm text-red-700">{r.rejectionReason}</p> : null}
    {isInvoiceApprover(context) && r.status === "requested" ? <InvoiceApprovalForm id={r.id} enabled={sageConfigured() && sageInvoiceCreationEnabled()} /> : null}
  </AppShell>;
}
