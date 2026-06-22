import { describe, expect, it } from "vitest";
import { productMatchesSearch, productSearchTerms } from "@/modules/quoting/products/product-search";

const patchLead = {
  sku: "LV-CAT6-2M",
  supplier: "Lanview",
  manufacturer: "Lanview",
  category: "Structured Cabling",
  description: "Lanview 2m CAT patch lead",
  itemType: "product"
};

describe("product search", () => {
  it("splits multi-word search terms", () => {
    expect(productSearchTerms(" 2m   patch ")).toEqual(["2m", "patch"]);
  });

  it("matches multi-word partial terms across product fields", () => {
    expect(productMatchesSearch(patchLead, "2m patch")).toBe(true);
    expect(productMatchesSearch(patchLead, "lan patch")).toBe(true);
    expect(productMatchesSearch(patchLead, "patch 2m")).toBe(true);
    expect(productMatchesSearch(patchLead, "ruckus patch")).toBe(false);
  });

  it("matches SKU, supplier, manufacturer, category, description and item type", () => {
    expect(productMatchesSearch(patchLead, "lv-cat")).toBe(true);
    expect(productMatchesSearch(patchLead, "lanview")).toBe(true);
    expect(productMatchesSearch(patchLead, "structured")).toBe(true);
    expect(productMatchesSearch(patchLead, "product")).toBe(true);
  });

  it("matches SKU, manufacturer and description fragments reliably", () => {
    expect(productMatchesSearch(patchLead, "CAT6-2")).toBe(true);
    expect(productMatchesSearch(patchLead, "lanv")).toBe(true);
    expect(productMatchesSearch(patchLead, "patch lead")).toBe(true);
  });

  it("tolerates punctuation and spacing around CAT6 style terms", () => {
    expect(productMatchesSearch(patchLead, "CAT 6")).toBe(true);
    expect(productMatchesSearch({ ...patchLead, description: "Lanview 2m CAT-6 patch lead" }, "cat6 patch")).toBe(true);
    expect(productMatchesSearch({ ...patchLead, sku: "LVCAT6BLACK", description: "Lanview patch lead" }, "cat-6")).toBe(true);
  });
});
