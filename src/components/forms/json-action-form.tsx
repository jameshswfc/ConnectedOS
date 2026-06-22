"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export type JsonFormOption = {
  id: string;
  label: string;
};

export type JsonFormField = {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "select" | "textarea" | "checkbox" | "email";
  required?: boolean;
  options?: JsonFormOption[];
  defaultValue?: string;
  placeholder?: string;
};

export function JsonActionForm({
  endpoint,
  method = "POST",
  buttonLabel,
  fields,
  fixed,
  successHref,
  successMessage,
  errorMessage = "Unable to save."
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  buttonLabel: string;
  fields: JsonFormField[];
  fixed?: Record<string, unknown>;
  successHref?: string;
  successMessage?: string;
  errorMessage?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function submit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { ...(fixed ?? {}) };
      for (const field of fields) {
        body[field.name] = field.type === "checkbox" ? formData.get(field.name) === "on" : formData.get(field.name) || undefined;
      }
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? errorMessage);
        return;
      }
      if (successMessage) {
        window.alert(successMessage);
      }
      if (successHref) {
        const resolvedHref = successHref.replace(":id", String(payload?.data?.id ?? ""));
        window.location.href = resolvedHref;
        return;
      }
      window.location.reload();
    } catch {
      setError(errorMessage);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      className="grid gap-3 md:grid-cols-2"
    >
      {fields.map((field) => <JsonActionField key={field.name} field={field} />)}
      {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : buttonLabel}</Button>
      </div>
    </form>
  );
}

function JsonActionField({ field }: { field: JsonFormField }) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input name={field.name} type="checkbox" defaultChecked={field.defaultValue === "true"} />
        {field.label}
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="text-sm font-medium text-slate-700">
        {field.label}
        <select name={field.name} required={field.required} defaultValue={field.defaultValue ?? ""} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3">
          <option value="">Select</option>
          {field.options?.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="md:col-span-2 text-sm font-medium text-slate-700">
        {field.label}
        <textarea name={field.name} rows={3} required={field.required} defaultValue={field.defaultValue} placeholder={field.placeholder} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
    );
  }

  return (
    <label className="text-sm font-medium text-slate-700">
      {field.label}
      <input
        name={field.name}
        type={field.type ?? "text"}
        required={field.required}
        defaultValue={field.defaultValue}
        placeholder={field.placeholder}
        step={field.type === "number" ? "0.5" : undefined}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3"
      />
    </label>
  );
}

export function JsonActionButton({
  endpoint,
  method,
  body,
  label,
  variant = "primary",
  confirmMessage,
  errorMessage = "Action failed."
}: {
  endpoint: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  label: string;
  variant?: "primary" | "secondary";
  confirmMessage?: string;
  errorMessage?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function run() {
    if (submittingRef.current) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? errorMessage);
        return;
      }
      window.location.reload();
    } catch {
      setError(errorMessage);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div>
      {error ? <p className="mb-1 text-xs text-red-700">{error}</p> : null}
      <Button type="button" variant={variant} onClick={run} disabled={submitting}>
        {submitting ? "Working..." : label}
      </Button>
    </div>
  );
}
