import { describe, expect, it } from "vitest";
import { calculateMarginPercent, calculateQuoteLine, calculateQuoteTotals } from "@/modules/quoting/quotes/quote-calculations";

describe("quote calculations", () => {
  it("calculates quote line totals and margin", () => {
    expect(calculateQuoteLine({ quantity: 2, unitCost: 100, unitSell: 150 })).toEqual({
      costTotal: 200,
      sellTotal: 300,
      marginTotal: 100,
      marginPercent: 33.33
    });
  });

  it("calculates quote totals from lines", () => {
    expect(calculateQuoteTotals([
      { costTotal: 200, sellTotal: 300, marginTotal: 100, marginPercent: 33.33 },
      { costTotal: 50, sellTotal: 100, marginTotal: 50, marginPercent: 50 }
    ])).toEqual({
      costTotal: 250,
      sellTotal: 400,
      marginTotal: 150,
      marginPercent: 37.5
    });
  });

  it("protects margin percentage against divide-by-zero", () => {
    expect(calculateMarginPercent(10, 0)).toBe(0);
    expect(calculateQuoteLine({ quantity: 0, unitCost: 100, unitSell: 150 }).marginPercent).toBe(0);
  });
});
