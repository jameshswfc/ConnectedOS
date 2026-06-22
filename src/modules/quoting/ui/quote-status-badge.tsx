import { labelFromQuoteValue } from "@/modules/quoting/ui/quote-format";

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  internal_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  sent: "bg-sky-100 text-sky-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-rose-100 text-rose-800",
  expired: "bg-zinc-200 text-zinc-700",
  rejected: "bg-red-100 text-red-800"
};

export function QuoteStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-normal ${statusStyles[status] ?? "bg-slate-100 text-slate-700"}`}>
      {labelFromQuoteValue(status)}
    </span>
  );
}
