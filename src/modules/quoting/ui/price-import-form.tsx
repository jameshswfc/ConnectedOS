"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

export function PriceImportForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);
    const response = await fetch("/api/v1/price-imports", { method: "POST", body: formData });
    setIsSubmitting(false);
    if (!response.ok) {
      setError(await friendlyActionError(response, "CSV import failed. Check the file format and required columns."));
      return;
    }
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div className="space-y-2 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Upload catalogue CSV</p>
        <p>Products, labour and services can all be uploaded here. Rows are upserted by supplier + SKU.</p>
        <a href="/api/v1/price-imports/sample" className="inline-flex h-9 items-center rounded-md border border-brand-700 px-3 text-sm font-medium text-brand-700">Download sample CSV</a>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Catalogue CSV
        <input name="file" type="file" accept=".csv,text/csv" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-medium text-slate-800">Required columns</p>
        <p>supplier, sku, manufacturer, category, description, item_type, unit_cost, unit_sell, lead_time_days</p>
        <p className="mt-2 font-medium text-slate-800">Allowed item_type values</p>
        <p>product, labour, service</p>
        <p className="mt-2 font-medium text-slate-800">Example row</p>
        <p>Connected Hospitality,LAB-PM-DAY,Connected Hospitality,Professional Services,Project Management Day,labour,450,750,0</p>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Importing..." : "Import CSV"}</Button>
    </form>
  );
}
