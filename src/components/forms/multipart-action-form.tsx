"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { JsonFormField } from "@/components/forms/json-action-form";

export function MultipartActionForm({
  endpoint,
  buttonLabel,
  fields,
  successHref,
  errorMessage = "Unable to save."
}: {
  endpoint: string;
  buttonLabel: string;
  fields: Array<JsonFormField & { accept?: string }>;
  successHref?: string;
  errorMessage?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(endpoint, { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? errorMessage);
        return;
      }
      if (successHref) {
        window.location.href = successHref.replace(":id", String(payload?.data?.id ?? ""));
        return;
      }
      formRef.current?.reset();
      window.location.reload();
    } catch {
      setError(errorMessage);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => <MultipartField key={field.name} field={field} />)}
      {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : buttonLabel}</Button>
      </div>
    </form>
  );
}

function MultipartField({ field }: { field: JsonFormField & { accept?: string } }) {
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
        <textarea name={field.name} rows={3} defaultValue={field.defaultValue} placeholder={field.placeholder} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
    );
  }

  if (field.type === "email" || field.type === "date" || field.type === "number" || field.type === "text") {
    return (
      <label className="text-sm font-medium text-slate-700">
        {field.label}
        <input
          name={field.name}
          type={field.type}
          required={field.required}
          defaultValue={field.defaultValue}
          placeholder={field.placeholder}
          step={field.type === "number" ? "0.01" : undefined}
          className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3"
        />
      </label>
    );
  }

  return (
    <label className="md:col-span-2 text-sm font-medium text-slate-700">
      {field.label}
      <input name={field.name} type="file" accept={field.accept} required={field.required} className="mt-1 block w-full text-sm text-slate-700" />
    </label>
  );
}
