"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResourceDeleteButton({ resourceId }: { resourceId: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/resources/${resourceId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Unable to update resource.");
        return;
      }
      const params = new URLSearchParams();
      if (payload?.data?.message) params.set("message", payload.data.message);
      if (payload?.data?.action) params.set("status", payload.data.action);
      const query = params.toString();
      window.location.href = query ? `/field-services/resources?${query}` : "/field-services/resources";
    } catch {
      setError("Unable to update resource.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {error ? <p className="mb-2 text-xs text-red-700">{error}</p> : null}
      {!confirmOpen ? (
        <Button type="button" variant="secondary" onClick={() => setConfirmOpen(true)} disabled={submitting}>
          Deactivate Resource
        </Button>
      ) : (
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-slate-900">Deactivate resource?</p>
          <p className="mt-1 text-sm text-slate-600">
            ConnectedOS will deactivate this resource, keep historic bookings visible, and cancel any future bookings so the central schedule stays accurate.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleDelete()} disabled={submitting}>
              {submitting ? "Working..." : "Deactivate Resource"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
