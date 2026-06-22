"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LeaveRejectAction({ requestId, compact = false }: { requestId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleReject() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/leave-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Unable to reject leave request. Please refresh and try again.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Unable to reject leave request. Please refresh and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Reject
      </Button>
    );
  }

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 p-3 ${compact ? "min-w-[16rem]" : "w-full max-w-xl"}`}>
      <p className="text-sm font-semibold text-slate-900">Reject leave request</p>
      <p className="mt-1 text-sm text-slate-600">Add a rejection reason so the requester gets a clear update.</p>
      <label className="mt-3 block text-sm font-medium text-slate-700">
        Rejection reason
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Explain why this leave request cannot be approved right now."
        />
      </label>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => { setOpen(false); setError(null); }}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleReject()} disabled={submitting}>
          {submitting ? "Rejecting..." : "Reject Leave"}
        </Button>
      </div>
    </div>
  );
}
