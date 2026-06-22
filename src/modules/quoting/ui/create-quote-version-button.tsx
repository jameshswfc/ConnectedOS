"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

export function CreateQuoteVersionButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);
    const response = await fetch(`/api/v1/quotes/${quoteId}/versions`, { method: "POST" });
    setIsSubmitting(false);
    if (response.ok) router.refresh();
    if (!response.ok) setError(await friendlyActionError(response, "Version could not be created."));
  }

  return <div className="space-y-1"><Button type="button" variant="secondary" onClick={handleClick} disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Version"}</Button>{error ? <p className="text-xs text-red-700">{error}</p> : null}</div>;
}
