"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Send, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const field = "mt-1 block w-full rounded border border-slate-300 bg-white p-2 text-sm";
export function InvoiceRequestForm({ projectId, triggers }: { projectId: string; triggers: { key: string; label: string }[] }) {
  const router = useRouter(); const busy = useRef(false);
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/v1/finance/invoice-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, projectId }), signal: AbortSignal.timeout(30000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.errors?.[0]?.message || "Unable to request this invoice.");
      router.push(`/finance/invoice-requests/${body.data.id}`); router.refresh();
    } catch (e) { setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "Request timed out. Check the invoice request list before trying again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <form onSubmit={submit} className="max-w-2xl space-y-4">
    <label className="block text-sm font-medium">Completed project or stage<select name="triggerKey" required className={field}><option value="">Select completed work</option>{triggers.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
    <label className="block text-sm font-medium">Invoice description<textarea name="description" required minLength={5} maxLength={500} rows={3} className={field} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Net amount (GBP)<input name="netAmount" type="number" min="0.01" max="999999999.99" step="0.01" required className={field} /></label><label className="text-sm font-medium">VAT rate<select name="taxRate" className={field}><option value="20">20%</option><option value="0">0% (subject to approval)</option></select></label></div>
    <p role="alert" className="text-sm text-red-700">{error}</p><Button type="submit" disabled={pending || !triggers.length}><Send className="mr-2 h-4 w-4" />{pending ? "Submitting" : "Request James's approval"}</Button>
  </form>;
}

export function InvoiceApprovalForm({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter(); const busy = useRef(false);
  const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  async function loadCustomers() {
    if (busy.current) return; busy.current = true; setPending(true); setMessage("");
    try { const response = await fetch("/api/v1/finance/invoice-requests/customers", { signal: AbortSignal.timeout(120000) }); const body = await response.json(); if (!response.ok) throw new Error(body.errors?.[0]?.message || "Unable to load Sage customers."); setCustomers(body.data); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Unable to load Sage customers."); }
    finally { busy.current = false; setPending(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>, action: "approve" | "reject") {
    event.preventDefault(); if (busy.current) return;
    busy.current = true; setPending(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/v1/finance/invoice-requests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, action, customerConfirmed: values.customerConfirmed === "on" }), signal: AbortSignal.timeout(180000) });
      const body = await response.json(); if (!response.ok) throw new Error(body.errors?.[0]?.message || "Unable to review this invoice request.");
      setMessage(body.data.status === "created" ? `Sage invoice ${body.data.invoiceNumber} created.` : body.data.status === "rejected" ? "Invoice request rejected." : "Check Sage before taking further action. Automatic retries are blocked."); router.refresh();
    } catch (e) { setMessage(e instanceof Error && e.name !== "TimeoutError" ? e.message : "Creation could not be confirmed. Refresh this page and check Sage before trying again."); router.refresh(); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className="mt-6 max-w-2xl space-y-6 border-t border-slate-200 pt-6">
    <h2 className="text-lg font-semibold">James&apos;s review</h2>
    {!enabled ? <p className="text-sm text-amber-800">Sage invoice creation is not enabled. This request remains pending.</p> : <>
      <Button variant="secondary" onClick={loadCustomers} disabled={pending}><RefreshCw className="mr-2 h-4 w-4" />Load Sage customers</Button>
      <form onSubmit={(e) => submit(e, "approve")} className="space-y-4">
        <label className="block text-sm font-medium">Sage customer<select name="contactId" required className={field}><option value="">Select the matching Sage customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Invoice date<input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={field} /></label><label className="text-sm font-medium">Payment due<input type="date" name="dueDate" required className={field} /></label></div>
        <label className="flex items-start gap-2 text-sm"><input name="customerConfirmed" type="checkbox" required className="mt-1" />I have checked the customer, completed work, amount and VAT. Create this invoice in Sage.</label>
        <Button disabled={pending || !customers.length}><Check className="mr-2 h-4 w-4" />{pending ? "Processing" : "Approve and create Sage invoice"}</Button>
      </form></>}
    <form onSubmit={(e) => submit(e, "reject")} className="space-y-3"><label className="block text-sm font-medium">Reason for rejection<textarea name="reason" required minLength={5} maxLength={1000} className={field} /></label><Button variant="secondary" disabled={pending}><X className="mr-2 h-4 w-4" />Reject request</Button></form>
    <p role="status" className="text-sm text-slate-700">{message}</p>
  </div>;
}
