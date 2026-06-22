import { describe, expect, it } from "vitest";
import { calculatePoTotals, calculatePurchaseOrderLineTotals, renderPurchaseOrderPdfBuffer } from "@/modules/procurement/procurement-service";

describe("procurement service", () => {
  it("calculates line totals and 20 percent tax", () => {
    const totals = calculatePurchaseOrderLineTotals({
      quantity: 2,
      unitCost: 125,
      taxRate: 20
    });

    expect(totals.lineTotal).toBe(250);
    expect(totals.taxAmount).toBe(50);
    expect(totals.totalIncludingTax).toBe(300);
  });

  it("calculates purchase order subtotal, tax total and grand total", () => {
    const totals = calculatePoTotals([
      { description: "Switch", quantity: 2, unitCost: 100, taxRate: 20 },
      { description: "Patch panel", quantity: 1, unitCost: 50, taxRate: 20 }
    ] as never);

    expect(totals.subtotal).toBe(250);
    expect(totals.vatAmount).toBe(50);
    expect(totals.totalAmount).toBe(300);
  });

  it("renders a purchase order PDF with wrapped supplier, delivery and line text plus VAT totals", async () => {
    const buffer = await renderPurchaseOrderPdfBuffer({
      id: "po-1",
      poNumber: "PO-2026-0001",
      status: "approved",
      currency: "GBP",
      expectedDeliveryDate: new Date("2026-07-01"),
      supplierName: "Hotel Technology Supply Group",
      supplierAddress: "Very Long Supplier Address, Building One, Third Floor, Innovation Park, Manchester, Greater Manchester, M1 2AB, United Kingdom",
      supplierContactName: "Samantha Buyer",
      supplierContactEmail: "samantha@supplier.example",
      deliveryAddress: "Loading Bay, Example Hotel, 99 Hospitality Avenue, South Wing, Manchester, Greater Manchester, M2 8AA, United Kingdom",
      notes: "Please deliver during weekday access hours only. Coordinate with the project manager before arrival because the hotel has guest-facing restrictions during conference setup windows.",
      subtotal: 1850,
      vatAmount: 370,
      totalAmount: 2220,
      supplier: {
        name: "Hotel Technology Supply Group",
        address: "Very Long Supplier Address, Building One, Third Floor, Innovation Park, Manchester, Greater Manchester, M1 2AB, United Kingdom",
        contactName: "Samantha Buyer",
        email: "samantha@supplier.example"
      },
      project: { projectNumber: "PRJ-2026-0004", name: "Hilton Manchester WiFi Upgrade" },
      quote: { quoteNumber: "Q-2026-0012" },
      changeRequest: { title: "Additional switching" },
      lines: [
        {
          sku: "SW-48-POE",
          manufacturer: "NetCo",
          description: "48-port managed PoE switch with long hardware specification text to prove the description cell wraps safely instead of running off the page or clipping through table borders.",
          quantity: 2,
          unitCost: 425,
          taxRate: 20,
          taxAmount: 170,
          totalIncludingTax: 1020
        },
        {
          sku: "CAB-CAT6A-BOX",
          manufacturer: "CableWorks",
          description: "Cat6A structured cabling box",
          quantity: 5,
          unitCost: 166,
          taxRate: 20,
          taxAmount: 166,
          totalIncludingTax: 1196
        }
      ]
    });

    const text = buffer.toString("latin1");
    const decoded = decodePdfHexText(text).replace(/\s+/g, "");

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(decoded).toContain("PONumber:PO-2026-0001");
    expect(decoded).toContain("VATat20%");
    expect(decoded).toContain("TotalincludingVAT");
    expect(countPdfPages(buffer)).toBeLessThanOrEqual(3);
  });

  it("renders purchase order PDFs with many lines without trailing runaway blank pages", async () => {
    const lines = Array.from({ length: 18 }, (_, index) => ({
      sku: `SKU-${index + 1}`,
      manufacturer: "Connected Hospitality",
      description: `Line ${index + 1} very long procurement description for access points, brackets, mounting kits and hotel technology accessories that should wrap safely.`,
      quantity: 1,
      unitCost: 100,
      taxRate: 20,
      taxAmount: 20,
      totalIncludingTax: 120
    }));

    const buffer = await renderPurchaseOrderPdfBuffer({
      id: "po-2",
      poNumber: "PO-2026-0002",
      status: "submitted",
      currency: "GBP",
      expectedDeliveryDate: new Date("2026-07-10"),
      supplierName: "Supplier Two",
      supplierAddress: "1 Procurement Way, London",
      supplierContactName: "Buyer Two",
      supplierContactEmail: "buyer.two@example.com",
      deliveryAddress: "Example Hotel, 1 Guest Street, London",
      notes: null,
      subtotal: 1800,
      vatAmount: 360,
      totalAmount: 2160,
      supplier: {
        name: "Supplier Two",
        address: "1 Procurement Way, London",
        contactName: "Buyer Two",
        email: "buyer.two@example.com"
      },
      project: null,
      quote: null,
      changeRequest: null,
      lines
    });

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(countPdfPages(buffer)).toBeLessThanOrEqual(6);
  });
});

function countPdfPages(buffer: Buffer) {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? 0;
}

function decodePdfHexText(pdfText: string) {
  return Array.from(pdfText.matchAll(/<([0-9A-F]+)>/gi))
    .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
    .join(" ");
}
