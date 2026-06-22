import type { OpportunityHealthStatus } from "@/modules/crm/opportunities/opportunity-health";

const healthStyles: Record<OpportunityHealthStatus, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800"
};

export function OpportunityHealthBadge({ status }: { status: OpportunityHealthStatus }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold uppercase ${healthStyles[status]}`}>
      {status}
    </span>
  );
}
