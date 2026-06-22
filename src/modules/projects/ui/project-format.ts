import { ProjectRagStatus } from "@prisma/client";

export function formatProjectMoney(value: unknown) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

export function formatProjectDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
}

export function formatProjectNumber(value: unknown) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(Number(value ?? 0));
}

export function projectLabel(value: string | null | undefined) {
  if (!value) return "-";
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function projectStatusClass(status: string) {
  if (["completed", "closed", "green", "collected", "paid"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["at_risk", "amber", "blocked", "on_hold"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["cancelled", "red", "overdue"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
  return "border-brand-100 bg-brand-50 text-brand-800";
}

export function ragSortValue(status: ProjectRagStatus) {
  return status === ProjectRagStatus.red ? 0 : status === ProjectRagStatus.amber ? 1 : 2;
}
