"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

type ActivityCompletionFormProps = {
  activityId: string;
};

export function ActivityCompletionForm({ activityId }: ActivityCompletionFormProps) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/v1/activities/${activityId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome })
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError(await friendlyActionError(response, "Unable to complete activity."));
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700" htmlFor="activity-outcome">
        Outcome notes
      </label>
      <textarea
        id="activity-outcome"
        value={outcome}
        onChange={(event) => setOutcome(event.target.value)}
        className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        placeholder="Add the result or update from this activity"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Completing..." : "Complete Activity"}
      </Button>
    </form>
  );
}
