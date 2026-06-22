"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";
import {
  filterContactsByAccount,
  filterOpportunitiesByAccount,
  initialQuoteCreateSelection,
  type QuoteAccountOption,
  type QuoteContactOption,
  type QuoteOpportunityOption
} from "@/modules/quoting/ui/quote-create-form-utils";

type QuoteCreateResponse = {
  data?: {
    id: string;
    versions: { id: string; versionNumber: number }[];
  };
};

export function QuoteCreateForm({
  accounts,
  opportunities,
  contacts,
  selectedOpportunityId
}: {
  accounts: QuoteAccountOption[];
  opportunities: QuoteOpportunityOption[];
  contacts: QuoteContactOption[];
  selectedOpportunityId?: string;
}) {
  const router = useRouter();
  const initialSelection = initialQuoteCreateSelection({ accounts, opportunities, selectedOpportunityId });
  const [accountId, setAccountId] = useState(initialSelection.accountId);
  const [opportunityId, setOpportunityId] = useState(initialSelection.opportunityId);
  const [contactId, setContactId] = useState(contacts.find((contact) => contact.accountId === initialSelection.accountId)?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const accountOpportunities = useMemo(
    () => filterOpportunitiesByAccount(opportunities, accountId),
    [accountId, opportunities]
  );
  const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === opportunityId);
  const accountContacts = useMemo(
    () => filterContactsByAccount(contacts, accountId),
    [accountId, contacts]
  );

  function handleAccountChange(nextAccountId: string) {
    setAccountId(nextAccountId);
    const firstOpportunity = opportunities.find((opportunity) => opportunity.accountId === nextAccountId);
    const firstContact = contacts.find((contact) => contact.accountId === nextAccountId);
    setOpportunityId(firstOpportunity?.id ?? "");
    setContactId(firstContact?.id ?? "");
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    const response = await fetch("/api/v1/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId,
        contactId,
        title: formData.get("title"),
        projectName: formData.get("title"),
        highLevelScope: formData.get("highLevelScope"),
        preparedDate: formData.get("preparedDate")
      })
    });

    if (!response.ok) {
      setError(await friendlyActionError(response, "Quote could not be created. Check opportunity, contact and High Level Scope."));
      return;
    }

    const payload = (await response.json()) as QuoteCreateResponse;
    const quote = payload.data;
    const version = quote?.versions.find((item) => item.versionNumber === 1) ?? quote?.versions[0];
    if (quote && version) {
      router.push(`/quotes/${quote.id}/versions/${version.id}`);
      router.refresh();
      return;
    }

    router.push("/quotes");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <label className="block text-sm font-medium text-slate-700">
        Account <span className="text-brand-700">*</span>
        <select value={accountId} onChange={(event) => handleAccountChange(event.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
          <option value="">Select account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Opportunity <span className="text-brand-700">*</span>
        <select value={opportunityId} onChange={(event) => setOpportunityId(event.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
          <option value="">Select opportunity</option>
          {accountOpportunities.map((opportunity) => (
            <option key={opportunity.id} value={opportunity.id}>
              {opportunity.opportunityName}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        Selected account: <span className="font-medium">{selectedAccount?.name ?? "Select an account"}</span>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Contact <span className="text-brand-700">*</span>
        <select name="contactId" value={contactId} onChange={(event) => setContactId(event.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
          <option value="">Select contact</option>
          {accountContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Quote title / project name <span className="text-brand-700">*</span>
        <input key={selectedOpportunity?.id} name="title" required defaultValue={selectedOpportunity?.opportunityName} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Prepared date
        <input name="preparedDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        High Level Scope <span className="text-brand-700">*</span>
        <textarea name="highLevelScope" required className="mt-1 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      {accountOpportunities.length === 0 && accountId ? <p className="text-sm text-amber-700">No opportunities are linked to this account. Add a CRM opportunity before creating a quote.</p> : null}
      {accountContacts.length === 0 && accountId ? <p className="text-sm text-amber-700">No contacts are linked to this account. Add a CRM contact before creating a quote.</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" disabled={!accountId || !opportunityId || !contactId || accountContacts.length === 0}>Create Quote and Open Builder</Button>
    </form>
  );
}
