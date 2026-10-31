"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

export function QuoteWorkflowActions({ quoteId, status, canApprove = false }: { quoteId: string; status: string; canApprove?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  async function post(action: string, body?: Record<string, string>) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
    const response = await fetch(`/api/v1/quotes/${quoteId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const result = response.status === 400 ? await response.clone().json().catch(() => null) : null;
      setError(result?.errors?.[0]?.message ?? await friendlyActionError(response, "Action could not be completed. Please refresh and check the quote status."));
      return;
    }
    router.refresh();
    } catch {
      setError("Unable to connect. Please refresh and check the quote status before trying again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function changeStatus(nextStatus: string) {
    await post("change-status", { status: nextStatus });
  }

  return (
    <div className="space-y-2">
      <fieldset disabled={pending} aria-busy={pending} className="flex flex-wrap gap-2">
        {status === "draft" ? <Button type="button" onClick={() => post("submit-for-approval")}>Submit for Approval</Button> : null}
        {status === "internal_review" && canApprove ? <Button type="button" onClick={() => post("approve")}>Approve</Button> : null}
        {status === "internal_review" && canApprove ? <Button type="button" variant="secondary" onClick={() => post("reject", { comments: window.prompt("Rejection reason") || "" })}>Reject</Button> : null}
        {status === "internal_review" && canApprove ? <Button type="button" variant="secondary" onClick={() => post("request-changes", { comments: window.prompt("Requested changes") || "" })}>Request Changes</Button> : null}
        {status === "internal_review" && !canApprove ? <p className="text-sm text-amber-800">Awaiting approval from an authorised approver.</p> : null}
        {status === "approved" ? <Button type="button" onClick={() => changeStatus("sent")}>Mark Sent</Button> : null}
        {status === "sent" ? <Button type="button" onClick={() => changeStatus("accepted")}>Mark Accepted</Button> : null}
        {status === "sent" ? <Button type="button" variant="secondary" onClick={() => changeStatus("declined")}>Mark Declined</Button> : null}
        {status === "sent" ? <Button type="button" variant="secondary" onClick={() => changeStatus("expired")}>Mark Expired</Button> : null}
      </fieldset>
      {pending ? <p role="status" className="text-sm text-slate-600">Saving quote status...</p> : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
