"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

type EditableQuoteLine = {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  unitSell: number;
};

export function QuoteLineActions({ line }: { line: EditableQuoteLine }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(line.description);
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [unitCost, setUnitCost] = useState(String(line.unitCost));
  const [unitSell, setUnitSell] = useState(String(line.unitSell));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const response = await fetch(`/api/v1/quote-lines/${line.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, quantity, unitCost, unitSell })
    });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Line could not be updated."));
      return;
    }
    setIsEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this quote line?")) return;
    setError(null);
    const response = await fetch(`/api/v1/quote-lines/${line.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Line could not be deleted."));
      return;
    }
    router.refresh();
  }

  if (!isEditing) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setIsEditing(true)}>Edit</Button>
        <Button type="button" variant="secondary" onClick={remove}>Delete</Button>
        {error ? <p className="basis-full text-xs text-red-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-700">
        Description
        <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-xs font-medium text-slate-700">
          Qty
          <input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" min="1" step="1" inputMode="numeric" pattern="[0-9]*" className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Unit cost
          <input value={unitCost} onChange={(event) => setUnitCost(event.target.value)} type="number" min="0" step="0.01" className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Unit sell
          <input value={unitSell} onChange={(event) => setUnitSell(event.target.value)} type="number" min="0" step="0.01" className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save}>Save</Button>
        <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
