import { describe, expect, it } from "vitest";
import { purchaseOrderCreateSchema, supplierInvoiceSchema } from "@/modules/procurement/procurement-schemas";

describe("procurement schemas", () => {
  it("parses purchase order header fields and line tax rates", () => {
    const result = purchaseOrderCreateSchema.parse({
      supplierId: "11111111-1111-4111-8111-111111111111",
      supplierName: "Supplier Snapshot Ltd",
      supplierContactEmail: "buyer@supplier.test",
      deliveryAddress: "123 Hotel Street",
      lines: [{ description: "Switch", quantity: "2", unitCost: "125.50", taxRate: "20" }]
    });

    expect(result.supplierName).toBe("Supplier Snapshot Ltd");
    expect(result.supplierContactEmail).toBe("buyer@supplier.test");
    expect(result.deliveryAddress).toBe("123 Hotel Street");
    expect(result.lines[0].quantity).toBe(2);
    expect(result.lines[0].unitCost).toBe(125.5);
    expect(result.lines[0].taxRate).toBe(20);
  });

  it("parses supplier invoice dates and amounts", () => {
    const result = supplierInvoiceSchema.parse({
      invoiceNumber: "INV-1",
      invoiceDate: "2026-06-14",
      amount: "500.25"
    });

    expect(result.invoiceDate).toBeInstanceOf(Date);
    expect(result.amount).toBe(500.25);
  });
});
