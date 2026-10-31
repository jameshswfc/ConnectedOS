"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";
import { opportunityTypeDefinitions } from "@/modules/crm/opportunities/opportunity-types";

type Props = {
  lead: { id: string; accountId: string | null; contactId: string | null; accountName: string | null; contactName: string | null; email: string | null; phone: string | null };
  accounts: { id: string; name: string }[];
  contacts: { id: string; accountId: string; name: string }[];
};

export function LeadConversionForm({ lead, accounts, contacts }: Props) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(lead.accountId ?? "");
  const [contactId, setContactId] = useState(lead.contactId ?? "");
  const fieldClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-brand-700";
  const names = (lead.contactName ?? "").trim().split(/\s+/);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    const payload = Object.fromEntries(Array.from(new FormData(event.currentTarget).entries()).filter(([, value]) => value !== ""));
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.clone().json().catch(() => null);
      if (!response.ok) {
        setError(response.status === 400 ? body?.errors?.[0]?.message ?? "Check the conversion fields." : await friendlyActionError(response, "Unable to convert this lead. Please refresh and try again."));
        return;
      }
      router.push(`/crm/opportunities/${body.data.opportunityId}`);
      router.refresh();
    } catch {
      setError("Unable to connect. Your lead is safe; please try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="max-w-3xl space-y-5" aria-busy={pending}>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Opportunity name<input required name="opportunityName" defaultValue={lead.accountName ?? ""} maxLength={250} className={fieldClass} /></label>
      <label className="text-sm font-medium">Opportunity type<select name="opportunityType" defaultValue="other" className={fieldClass}>{opportunityTypeDefinitions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label className="text-sm font-medium">Expected close date<input type="date" name="expectedCloseDate" className={fieldClass} /></label>
      <label className="text-sm font-medium">Account<select name="accountId" value={accountId} onChange={(event) => { setAccountId(event.target.value); setContactId(""); }} className={fieldClass}><option value="">Create new account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      {!accountId ? <label className="text-sm font-medium">New account name<input required name="accountName" defaultValue={lead.accountName ?? ""} maxLength={250} className={fieldClass} /></label> : null}
      <label className="text-sm font-medium">Contact<select name="contactId" value={contactId} onChange={(event) => setContactId(event.target.value)} className={fieldClass}><option value="">New contact / no contact yet</option>{contacts.filter((contact) => contact.accountId === accountId).map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label>
    </div>
    {!contactId ? <fieldset className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2"><legend className="font-medium">New Contact (Optional)</legend>
      <label className="text-sm font-medium">First name<input name="firstName" defaultValue={names[0] ?? ""} className={fieldClass} /></label>
      <label className="text-sm font-medium">Last name<input name="lastName" defaultValue={names.slice(1).join(" ")} className={fieldClass} /></label>
      <label className="text-sm font-medium">Email<input type="email" name="email" defaultValue={lead.email ?? ""} className={fieldClass} /></label>
      <label className="text-sm font-medium">Phone<input name="phone" defaultValue={lead.phone ?? ""} className={fieldClass} /></label>
    </fieldset> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <Button type="submit" disabled={pending}><ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />{pending ? "Converting..." : "Qualify and Convert"}</Button>
  </form>;
}
