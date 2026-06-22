"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

type Option = { value: string; label: string };
type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "checkbox";
  required?: boolean;
  options?: Option[];
};

export function QuotingJsonForm({
  action,
  redirectTo,
  submitLabel,
  fields,
  method = "POST",
  defaultValues = {}
}: {
  action: string;
  redirectTo: string;
  submitLabel: string;
  fields: Field[];
  method?: "POST" | "PATCH";
  defaultValues?: Record<string, string | number | boolean | null | undefined>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const payload = Object.fromEntries(
      fields.map((field) => {
        if (field.type === "checkbox") return [field.name, formData.get(field.name) === "on"];
        const value = formData.get(field.name);
        return [field.name, value === "" ? undefined : value];
      })
    );

    const response = await fetch(action, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setError(await friendlyActionError(response, "The record could not be saved. Check required fields and permissions."));
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      {fields.map((field) => (
        <label key={field.name} className="block text-sm font-medium text-slate-700">
          {field.label}
          {field.required ? <span className="text-brand-700"> *</span> : null}
          {field.type === "textarea" ? (
            <textarea name={field.name} required={field.required} defaultValue={formatDefault(defaultValues[field.name])} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          ) : field.type === "select" ? (
            <select name={field.name} required={field.required} defaultValue={formatDefault(defaultValues[field.name])} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
              <option value="">Select</option>
              {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : field.type === "checkbox" ? (
            <input name={field.name} type="checkbox" defaultChecked={Boolean(defaultValues[field.name] ?? true)} className="mt-2 block h-4 w-4" />
          ) : (
            <input name={field.name} type={field.type ?? "text"} required={field.required} defaultValue={formatDefault(defaultValues[field.name])} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
          )}
        </label>
      ))}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

export const quoteStatusOptions: Option[] = [
  { value: "draft", label: "Draft" },
  { value: "internal_review", label: "Internal Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" }
];

function formatDefault(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}
