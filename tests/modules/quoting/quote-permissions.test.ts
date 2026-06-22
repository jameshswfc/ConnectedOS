import { describe, expect, it } from "vitest";
import { productSupplierSkuKey } from "@/modules/quoting/products/product-service";
import { quoteVisibilityWhere } from "@/modules/quoting/quotes/quote-permissions";
import { nextQuoteVersionNumber, quoteLineAuditActions } from "@/modules/quoting/quotes/quote-service";

describe("quote permissions and helpers", () => {
  it("scopes sales users to own quotes", () => {
    expect(quoteVisibilityWhere({ userId: "sales-user", role: "Sales", permissions: ["quotes.read_all", "quotes.read_own"] })).toEqual({
      deletedAt: null,
      ownerId: "sales-user"
    });
  });

  it("allows managers with read_all to see all quotes", () => {
    expect(quoteVisibilityWhere({ userId: "manager", permissions: ["quotes.read_all"] })).toEqual({ deletedAt: null });
  });

  it("builds product uniqueness from supplier and sku", () => {
    expect(productSupplierSkuKey("Supplier A", "SKU-1")).toEqual({
      supplier_sku: {
        supplier: "Supplier A",
        sku: "SKU-1"
      }
    });
  });

  it("increments quote version numbers", () => {
    expect(nextQuoteVersionNumber(1)).toBe(2);
  });

  it("uses explicit quote line audit actions for edit and delete", () => {
    expect(quoteLineAuditActions).toEqual({
      edited: "quote_line_edited",
      deleted: "quote_line_deleted"
    });
  });
});
