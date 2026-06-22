import { describe, expect, it } from "vitest";
import { calculateOutstanding, calculateProjectCommercialBreakdown, calculateRemainingResourceDays } from "@/modules/projects/project-budget";

describe("project budget helpers", () => {
  it("maps quote lines to Sprint 8 commercial categories", () => {
    expect(calculateProjectCommercialBreakdown([
      { lineType: "product", category: "Switching", sellTotal: 1000 },
      { lineType: "labour", category: "Installation Services", sellTotal: 500 },
      { lineType: "service", category: "Project Management", sellTotal: 250 },
      { lineType: "service", category: "Design", sellTotal: 300 }
    ])).toEqual({
      hardwareSoftwareLicensing: 1000,
      professionalServices: 300,
      installationCabling: 500,
      projectManagement: 250,
      totalSalesPrice: 2050,
      totalCost: 0
    });
  });

  it("calculates outstanding and remaining resource days", () => {
    expect(calculateOutstanding(750, 200)).toBe(550);
    expect(calculateRemainingResourceDays(10, 4, 7)).toBe(3);
  });
});
