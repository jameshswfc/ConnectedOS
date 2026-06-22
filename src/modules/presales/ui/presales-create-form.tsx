"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";
import {
  presalesCategoryDefinitions,
  presalesCommercialPriorityDefinitions,
  presalesPriorityDefinitions,
  presalesTypeDefinitions
} from "@/modules/presales/presales-constants";

type AccountOption = { id: string; name: string };
type OpportunityOption = { id: string; accountId: string; name: string; value: number };
type QuoteOption = { id: string; accountId: string; opportunityId: string | null; label: string; value: number; version: number };
type EngineerOption = { id: string; name: string };

export function PresalesCreateForm({ accounts, opportunities, quotes, engineers, selectedOpportunityId = "", selectedQuoteId = "" }: { accounts: AccountOption[]; opportunities: OpportunityOption[]; quotes: QuoteOption[]; engineers: EngineerOption[]; selectedOpportunityId?: string; selectedQuoteId?: string }) {
  const router = useRouter();
  const initialQuote = quotes.find((quote) => quote.id === selectedQuoteId);
  const initialOpportunityId = selectedOpportunityId || initialQuote?.opportunityId || "";
  const initialOpportunity = opportunities.find((opportunity) => opportunity.id === initialOpportunityId);
  const [accountId, setAccountId] = useState(initialOpportunity?.accountId ?? initialQuote?.accountId ?? accounts[0]?.id ?? "");
  const [opportunityId, setOpportunityId] = useState(initialOpportunityId);
  const [quoteId, setQuoteId] = useState(selectedQuoteId);
  const [error, setError] = useState<string | null>(null);
  const accountOpportunities = useMemo(() => opportunities.filter((opportunity) => opportunity.accountId === accountId), [accountId, opportunities]);
  const accountQuotes = useMemo(() => quotes.filter((quote) => quote.accountId === accountId && (!opportunityId || quote.opportunityId === opportunityId)), [accountId, opportunityId, quotes]);

  function handleAccountChange(nextAccountId: string) {
    setAccountId(nextAccountId);
    setOpportunityId("");
    setQuoteId("");
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    const response = await fetch("/api/v1/presales-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        opportunityId,
        quoteId,
        assignedToId: formData.get("assignedToId"),
        requestCategory: formData.get("requestCategory"),
        requestType: formData.get("requestType"),
        priority: formData.get("priority"),
        commercialPriority: formData.get("commercialPriority"),
        requestedDeliveryDate: formData.get("requestedDeliveryDate"),
        internalDeadline: formData.get("internalDeadline"),
        estimatedHours: formData.get("estimatedHours"),
        description: formData.get("description")
      })
    });

    if (!response.ok) {
      setError(await friendlyActionError(response, "Pre-sales request could not be created. Check required fields and permissions."));
      return;
    }
    const payload = await response.json() as { data?: { id: string } };
    router.push(payload.data?.id ? `/presales/${payload.data.id}` : "/presales");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <label className="block text-sm font-medium text-slate-700">Account <span className="text-brand-700">*</span><select value={accountId} onChange={(event) => handleAccountChange(event.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"><option value="">Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label className="block text-sm font-medium text-slate-700">Opportunity<select value={opportunityId} onChange={(event) => { setOpportunityId(event.target.value); setQuoteId(""); }} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"><option value="">No opportunity</option>{accountOpportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.name}</option>)}</select></label>
      <label className="block text-sm font-medium text-slate-700">Quote<select value={quoteId} onChange={(event) => setQuoteId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"><option value="">No quote</option>{accountQuotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.label}</option>)}</select></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Category <span className="text-brand-700">*</span><select name="requestCategory" required defaultValue="multi_discipline" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">{presalesCategoryDefinitions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Type <span className="text-brand-700">*</span><select name="requestType" required defaultValue="design_review" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">{presalesTypeDefinitions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Priority <span className="text-brand-700">*</span><select name="priority" required defaultValue="normal" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">{presalesPriorityDefinitions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Commercial Priority <span className="text-brand-700">*</span><select name="commercialPriority" required defaultValue="normal" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">{presalesCommercialPriorityDefinitions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Requested Delivery Date<input name="requestedDeliveryDate" type="date" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
        <label className="block text-sm font-medium text-slate-700">Internal Deadline <span className="text-brand-700">*</span><input name="internalDeadline" type="date" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
        <label className="block text-sm font-medium text-slate-700">Estimated Hours<input name="estimatedHours" type="number" min="0" step="0.25" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
        <label className="block text-sm font-medium text-slate-700">Assigned Engineer<select name="assignedToId" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"><option value="">Unassigned</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name}</option>)}</select></label>
      </div>
      <label className="block text-sm font-medium text-slate-700">Description <span className="text-brand-700">*</span><textarea name="description" required className="mt-1 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" disabled={!accountId}>Create Pre-Sales Request</Button>
    </form>
  );
}
