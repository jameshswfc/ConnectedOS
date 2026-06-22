import { PresalesRagStatus, PresalesRequestStatus, PresalesSlaStatus } from "@prisma/client";
import {
  labelPresalesValue,
  presalesCategoryDefinitions,
  presalesCommercialPriorityDefinitions,
  presalesPriorityDefinitions,
  presalesRagStatusLabels,
  presalesSlaStatusLabels,
  presalesStatusDefinitions,
  presalesTaskStatusDefinitions,
  presalesTypeDefinitions
} from "@/modules/presales/presales-constants";

export function formatPresalesDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export function formatPresalesMoney(value: unknown) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
}

export function presalesCategoryLabel(value: string) {
  return presalesCategoryDefinitions.find((item) => item.value === value)?.label ?? labelPresalesValue(value);
}

export function presalesTypeLabel(value: string) {
  return presalesTypeDefinitions.find((item) => item.value === value)?.label ?? labelPresalesValue(value);
}

export function presalesPriorityLabel(value: string) {
  return presalesPriorityDefinitions.find((item) => item.value === value)?.label ?? labelPresalesValue(value);
}

export function presalesCommercialPriorityLabel(value: string) {
  return presalesCommercialPriorityDefinitions.find((item) => item.value === value)?.label ?? labelPresalesValue(value);
}

export function presalesStatusLabel(value: string) {
  return presalesStatusDefinitions.find((item) => item.value === value)?.label ?? labelPresalesValue(value);
}

export function presalesTaskStatusLabel(value: string) {
  return presalesTaskStatusDefinitions.find((item) => item.value === value)?.label ?? labelPresalesValue(value);
}

export function PresalesStatusBadge({ status }: { status: PresalesRequestStatus | string }) {
  return <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{presalesStatusLabel(status)}</span>;
}

export function PresalesSlaBadge({ status }: { status: PresalesSlaStatus | string }) {
  const tone = status === PresalesSlaStatus.overdue ? "bg-red-100 text-red-800" : status === PresalesSlaStatus.due_soon ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{presalesSlaStatusLabels[status as PresalesSlaStatus] ?? presalesStatusLabel(status)}</span>;
}

export function PresalesRagBadge({ status }: { status: PresalesRagStatus | string }) {
  const tone = status === PresalesRagStatus.red ? "bg-red-100 text-red-800" : status === PresalesRagStatus.amber ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{presalesRagStatusLabels[status as PresalesRagStatus] ?? presalesStatusLabel(status)}</span>;
}
