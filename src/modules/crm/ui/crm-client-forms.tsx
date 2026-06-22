"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";
import { opportunityStageDefinitions } from "@/modules/crm/opportunities/opportunity-stages";
import { opportunityTypeDefinitions } from "@/modules/crm/opportunities/opportunity-types";

type Option = {
  value: string;
  label: string;
};

type FormField = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "textarea" | "select";
  required?: boolean;
  options?: Option[];
};

type CrmCreateFormProps = {
  action: string;
  redirectTo: string;
  fields: FormField[];
  submitLabel: string;
  method?: "POST" | "PATCH";
  defaultValues?: Record<string, string | number | boolean | null | undefined>;
};

export function CrmCreateForm({ action, redirectTo, fields, submitLabel, method = "POST", defaultValues = {} }: CrmCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const payload = Object.fromEntries(
      fields.map((field) => {
        const value = formData.get(field.name);
        return [field.name, value === "" ? undefined : value];
      })
    );

    const response = await fetch(action, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setError(await friendlyActionError(response, "The record could not be saved. Check the required fields and your permissions."));
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
            <textarea name={field.name} required={field.required} defaultValue={formatDefaultValue(defaultValues[field.name])} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          ) : field.type === "select" ? (
            <select name={field.name} required={field.required} defaultValue={formatDefaultValue(defaultValues[field.name])} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
              <option value="">Select</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              defaultValue={formatDefaultValue(defaultValues[field.name])}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
          )}
        </label>
      ))}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

function formatDefaultValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export const accountTypeOptions: Option[] = [
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "partner", label: "Partner" },
  { value: "supplier", label: "Supplier" },
  { value: "former_customer", label: "Former Customer" }
];

export const accountStatusOptions: Option[] = [
  { value: "prospect", label: "Prospect" },
  { value: "active_customer", label: "Active Customer" },
  { value: "partner", label: "Partner" },
  { value: "supplier", label: "Supplier" },
  { value: "inactive", label: "Inactive" },
  { value: "former_customer", label: "Former Customer" }
];

export const leadStatusOptions: Option[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "disqualified", label: "Disqualified" }
];

export const relationshipStrengthOptions: Option[] = [
  { value: "unknown", label: "Unknown" },
  { value: "weak", label: "Weak" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
  { value: "secured", label: "Secured" },
  { value: "preferred_partner", label: "Preferred Partner" },
  { value: "only_partner", label: "Only Partner" }
];

export const opportunityTypeOptions: Option[] = opportunityTypeDefinitions.map((type) => ({ value: type.value, label: type.label }));

export const opportunitySourceOptions: Option[] = [
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "website", label: "Website" },
  { value: "existing_customer", label: "Existing Customer" },
  { value: "partner", label: "Partner" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "tender_portal", label: "Tender Portal" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "conference_event", label: "Conference/Event" },
  { value: "other", label: "Other" }
];

export const opportunityStageOptions: Option[] = opportunityStageDefinitions.map((stage) => ({ value: stage.value, label: stage.label }));

export const activityTypeOptions: Option[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
  { value: "note", label: "Note" }
];
