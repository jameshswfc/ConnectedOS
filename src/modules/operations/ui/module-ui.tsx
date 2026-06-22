import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function formatModuleLabel(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatModuleDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
}

export function formatModuleMoney(value: unknown, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(value ?? 0));
}

export function formatModuleNumber(value: unknown) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

export function moduleStatusClass(status: string | null | undefined) {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-700";
  if (["approved", "confirmed", "complete", "completed", "active", "paid", "received", "published", "resolved", "installed", "issued", "clear", "on_track"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (["submitted", "triage", "draft", "in_progress", "partially_received", "warning", "due_soon", "queried"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (["rejected", "cancelled", "critical", "urgent", "blocked", "overdue", "breached"].includes(status)) {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-brand-100 bg-brand-50 text-brand-800";
}

export function ModuleStatusBadge({ value }: { value: string | null | undefined }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${moduleStatusClass(value)}`}>
      {formatModuleLabel(value)}
    </span>
  );
}

export function ModuleMetricCard({ title, value, helper }: { title: string; value: string | number; helper?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-brand-900">{value}</p>
        {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ModuleDetailGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="mt-1 text-sm text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
