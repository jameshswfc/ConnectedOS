import type { QuoteLineType } from "@prisma/client";

export type ProjectCommercialBreakdownLine = {
  lineType: QuoteLineType | string;
  category?: string | null;
  sellTotal: number;
  costTotal?: number;
};

export function calculateProjectCommercialBreakdown(lines: ProjectCommercialBreakdownLine[]) {
  return lines.reduce(
    (totals, line) => {
      const bucket = commercialBucket(line);
      const sellTotal = Number(line.sellTotal ?? 0);
      const costTotal = Number(line.costTotal ?? 0);
      totals[bucket] += sellTotal;
      totals.totalSalesPrice += sellTotal;
      totals.totalCost += costTotal;
      return totals;
    },
    {
      hardwareSoftwareLicensing: 0,
      professionalServices: 0,
      installationCabling: 0,
      projectManagement: 0,
      totalSalesPrice: 0,
      totalCost: 0
    }
  );
}

export function calculateOutstanding(invoicedAmount: number, collectedAmount: number) {
  return Math.max(0, invoicedAmount - collectedAmount);
}

export function calculateRemainingResourceDays(budget: number, scheduled: number, used: number) {
  return budget - Math.max(scheduled, used);
}

function commercialBucket(line: ProjectCommercialBreakdownLine): "hardwareSoftwareLicensing" | "professionalServices" | "installationCabling" | "projectManagement" {
  const category = (line.category ?? "").toLowerCase();
  if (line.lineType === "product") return "hardwareSoftwareLicensing";
  if (category.includes("installation") || category.includes("cabling")) return "installationCabling";
  if (category.includes("project management")) return "projectManagement";
  if (line.lineType === "labour" || line.lineType === "service") return "professionalServices";
  return "hardwareSoftwareLicensing";
}
