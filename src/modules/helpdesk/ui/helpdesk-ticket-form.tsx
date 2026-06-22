"use client";

import { HelpdeskImpact, HelpdeskPriority, HelpdeskTicketCategory, HelpdeskTicketSource, HelpdeskTicketType, HelpdeskUrgency } from "@prisma/client";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { filterAccountScopedOptions, isOptionValidForAccount, type AccountScopedOption } from "@/modules/helpdesk/helpdesk-form-utils";

type SimpleOption = {
  id: string;
  label: string;
};

type HelpdeskTicketFormProps = {
  accounts: SimpleOption[];
  contacts: AccountScopedOption[];
  projects: AccountScopedOption[];
  assets: AccountScopedOption[];
  queues: SimpleOption[];
  users: SimpleOption[];
};

export function HelpdeskTicketForm({ accounts, contacts, projects, assets, queues, users }: HelpdeskTicketFormProps) {
  const [form, setForm] = useState({
    accountId: "",
    contactId: "",
    projectId: "",
    assetId: "",
    queueId: "",
    assignedToId: "",
    raisedByName: "",
    raisedByEmail: "",
    title: "",
    description: "",
    ticketType: "",
    category: "",
    priority: HelpdeskPriority.normal,
    impact: HelpdeskImpact.low,
    urgency: HelpdeskUrgency.low,
    source: HelpdeskTicketSource.manual
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredContacts = useMemo(() => filterAccountScopedOptions(contacts, form.accountId || null), [contacts, form.accountId]);
  const filteredProjects = useMemo(() => filterAccountScopedOptions(projects, form.accountId || null), [projects, form.accountId]);
  const filteredAssets = useMemo(() => filterAccountScopedOptions(assets, form.accountId || null), [assets, form.accountId]);

  function updateField(name: keyof typeof form, value: string) {
    if (name === "accountId") {
      const nextAccountId = value;
      setForm((current) => ({
        ...current,
        accountId: nextAccountId,
        contactId: isOptionValidForAccount(current.contactId, nextAccountId || null, contacts) ? current.contactId : "",
        projectId: isOptionValidForAccount(current.projectId, nextAccountId || null, projects) ? current.projectId : "",
        assetId: isOptionValidForAccount(current.assetId, nextAccountId || null, assets) ? current.assetId : ""
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/helpdesk/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: form.accountId || undefined,
          contactId: form.contactId || undefined,
          projectId: form.projectId || undefined,
          assetId: form.assetId || undefined,
          queueId: form.queueId || undefined,
          assignedToId: form.assignedToId || undefined,
          raisedByName: form.raisedByName || undefined,
          raisedByEmail: form.raisedByEmail || undefined,
          title: form.title,
          description: form.description,
          ticketType: form.ticketType,
          category: form.category,
          priority: form.priority,
          impact: form.impact,
          urgency: form.urgency,
          source: form.source
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Unable to create ticket. Please check the required fields.");
        return;
      }
      window.location.href = `/helpdesk/tickets/${payload?.data?.id ?? ""}`;
    } catch {
      setError("Unable to create ticket. Please check the required fields.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <SelectField label="Account" value={form.accountId} onChange={(value) => updateField("accountId", value)} options={accounts} />
      <SelectField
        label="Contact"
        value={form.contactId}
        onChange={(value) => updateField("contactId", value)}
        options={filteredContacts.map(({ id, label }) => ({ id, label }))}
        disabled={!form.accountId}
        emptyLabel={form.accountId ? "Select" : "Select an account first"}
      />
      <SelectField
        label="Project"
        value={form.projectId}
        onChange={(value) => updateField("projectId", value)}
        options={filteredProjects.map(({ id, label }) => ({ id, label }))}
        disabled={!form.accountId}
        emptyLabel={form.accountId ? "Select" : "Select an account first"}
      />
      <SelectField
        label="Asset"
        value={form.assetId}
        onChange={(value) => updateField("assetId", value)}
        options={filteredAssets.map(({ id, label }) => ({ id, label }))}
        disabled={!form.accountId}
        emptyLabel={form.accountId ? "Select" : "Select an account first"}
      />
      <SelectField label="Queue" value={form.queueId} onChange={(value) => updateField("queueId", value)} options={queues} />
      <SelectField label="Assigned to" value={form.assignedToId} onChange={(value) => updateField("assignedToId", value)} options={users} />
      <InputField label="Raised by name" value={form.raisedByName} onChange={(value) => updateField("raisedByName", value)} />
      <InputField label="Raised by email" type="email" value={form.raisedByEmail} onChange={(value) => updateField("raisedByEmail", value)} />
      <InputField label="Title" value={form.title} onChange={(value) => updateField("title", value)} required />
      <TextareaField label="Description" value={form.description} onChange={(value) => updateField("description", value)} required />
      <SelectField label="Ticket type" value={form.ticketType} onChange={(value) => updateField("ticketType", value)} options={Object.values(HelpdeskTicketType).map((value) => ({ id: value, label: value.replaceAll("_", " ") }))} required />
      <SelectField label="Category" value={form.category} onChange={(value) => updateField("category", value)} options={Object.values(HelpdeskTicketCategory).map((value) => ({ id: value, label: value.replaceAll("_", " ") }))} required />
      <SelectField label="Priority" value={form.priority} onChange={(value) => updateField("priority", value)} options={Object.values(HelpdeskPriority).map((value) => ({ id: value, label: value }))} />
      <SelectField label="Impact" value={form.impact} onChange={(value) => updateField("impact", value)} options={Object.values(HelpdeskImpact).map((value) => ({ id: value, label: value }))} />
      <SelectField label="Urgency" value={form.urgency} onChange={(value) => updateField("urgency", value)} options={Object.values(HelpdeskUrgency).map((value) => ({ id: value, label: value }))} />
      <SelectField label="Source" value={form.source} onChange={(value) => updateField("source", value)} options={Object.values(HelpdeskTicketSource).map((value) => ({ id: value, label: value.replaceAll("_", " ") }))} />
      {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Ticket"}</Button>
      </div>
    </form>
  );
}

function InputField({
  label,
  value,
  onChange,
  required = false,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "email";
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3"
      />
    </label>
  );
}

function TextareaField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="md:col-span-2 text-sm font-medium text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={4}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  emptyLabel = "Select"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SimpleOption[];
  required?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}
