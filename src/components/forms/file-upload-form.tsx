"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function FileUploadForm({
  endpoint,
  fieldName = "files",
  buttonLabel = "Upload Files",
  errorMessage = "Unable to upload files."
}: {
  endpoint: string;
  fieldName?: string;
  buttonLabel?: string;
  errorMessage?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: form
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? errorMessage);
        return;
      }
      formRef.current?.reset();
      window.location.reload();
    } catch {
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <input name={fieldName} type="file" multiple className="block w-full text-sm text-slate-700" />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" disabled={submitting}>{submitting ? "Uploading..." : buttonLabel}</Button>
    </form>
  );
}
