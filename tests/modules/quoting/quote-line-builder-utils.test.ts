import { describe, expect, it } from "vitest";
import { calculateQuoteLine } from "@/modules/quoting/quotes/quote-calculations";
import { catalogueItemToLineDefaults } from "@/modules/quoting/ui/quote-line-builder-utils";

describe("quote line builder utilities", () => {
  const catalogueItem = {
    id: "item-1",
    sku: "LAB-ENG-DAY",
    supplier: "Connected Hospitality",
    manufacturer: "Connected Hospitality",
    category: "Engineering",
    description: "Engineering Day Rate",
    itemType: "labour",
    costPrice: 350,
    defaultSellPrice: 650,
    marginPercent: 46.15,
    leadTimeDays: 0
  };

  it("populates line defaults from selected catalogue item", () => {
    expect(catalogueItemToLineDefaults(catalogueItem)).toEqual({
      lineType: "labour",
      description: "Engineering Day Rate",
      quantity: "1",
      unitCost: "350",
      unitSell: "650"
    });
  });

  it("allows sell override and recalculates line totals", () => {
    const totals = calculateQuoteLine({
      quantity: 2,
      unitCost: 350,
      unitSell: 700
    });

    expect(totals.costTotal).toBe(700);
    expect(totals.sellTotal).toBe(1400);
    expect(totals.marginTotal).toBe(700);
  });
});
