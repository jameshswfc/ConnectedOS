import { describe, expect, it } from "vitest";
import { serializeProduct } from "@/modules/quoting/products/product-serializer";

describe("product serializer", () => {
  it("converts Decimal-like values to plain numbers for client components", () => {
    const product = serializeProduct({
      id: "product-1",
      sku: "AP-1",
      supplier: "Supplier",
      manufacturer: "Manufacturer",
      category: "Wireless",
      description: "Access point",
      itemType: "product",
      costPrice: { toString: () => "100.50" },
      defaultSellPrice: { toString: () => "150.75" },
      marginPercent: { toString: () => "33.33" },
      leadTimeDays: 7
    });

    expect(product.costPrice).toBe(100.5);
    expect(product.defaultSellPrice).toBe(150.75);
    expect(product.marginPercent).toBe(33.33);
  });
});
