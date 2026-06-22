"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

export function QuoteTermsEditor({ versionId, terms }: { versionId: string; terms: string }) {
  const router = useRouter();
  const [value, setValue] = useState(terms);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setError(null);
    setSaved(false);
    const response = await fetch(`/api/v1/quote-versions/${versionId}/terms`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terms: value })
    });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Terms could not be saved."));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <label className="block text-sm font-medium text-slate-700">
        Quote terms
        <textarea value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save}>Save Terms</Button>
        {saved ? <span className="text-sm text-emerald-700">Terms saved.</span> : null}
        {error ? <span className="text-sm text-red-700">{error}</span> : null}
      </div>
    </div>
  );
}
