"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

export function QuoteWorkflowActions({ quoteId, status, canApprove = false }: { quoteId: string; status: string; canApprove?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function post(action: string, body?: Record<string, string>) {
    setError(null);
    const response = await fetch(`/api/v1/quotes/${quoteId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Action could not be completed."));
      return;
    }
    router.refresh();
  }

  async function changeStatus(nextStatus: string) {
    await post("change-status", { status: nextStatus });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? <Button type="button" onClick={() => post("submit-for-approval")}>Submit for Approval</Button> : null}
        {status === "internal_review" && canApprove ? <Button type="button" onClick={() => post("approve")}>Approve</Button> : null}
        {status === "internal_review" && canApprove ? <Button type="button" variant="secondary" onClick={() => post("reject", { comments: window.prompt("Rejection reason") || "" })}>Reject</Button> : null}
        {status === "internal_review" && canApprove ? <Button type="button" variant="secondary" onClick={() => post("request-changes", { comments: window.prompt("Requested changes") || "" })}>Request Changes</Button> : null}
        {status === "internal_review" && !canApprove ? <p className="text-sm text-amber-800">Awaiting approval from an authorised approver.</p> : null}
        {status === "approved" ? <Button type="button" onClick={() => changeStatus("sent")}>Mark Sent</Button> : null}
        {status === "sent" ? <Button type="button" onClick={() => changeStatus("accepted")}>Mark Accepted</Button> : null}
        {status === "sent" ? <Button type="button" variant="secondary" onClick={() => changeStatus("declined")}>Mark Declined</Button> : null}
        {status === "sent" ? <Button type="button" variant="secondary" onClick={() => changeStatus("expired")}>Mark Expired</Button> : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
