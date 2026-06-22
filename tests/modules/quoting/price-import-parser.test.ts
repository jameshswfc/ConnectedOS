import { describe, expect, it } from "vitest";
import { DEFAULT_PRICE_IMPORT_MARKUP_PERCENT, parseMoney, parsePriceImportCsv, samplePriceImportCsv } from "@/modules/quoting/price-imports/price-import-parser";

describe("price import parser", () => {
  it("parses valid CSV rows", () => {
    const result = parsePriceImportCsv("supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days\nDisty,AP-1,Ubiquiti,Wireless,Access point,product,100,150,5");

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      supplier: "Disty",
      sku: "AP-1",
      itemType: "product",
      unitCost: 100,
      unitSell: 150,
      leadTimeDays: 5
    });
  });

  it("reports missing required columns", () => {
    const result = parsePriceImportCsv("supplier,sku\nDisty,AP-1");

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain("Missing required columns");
  });

  it("reports invalid row values", () => {
    const result = parsePriceImportCsv("supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days\nDisty,AP-1,Ubiquiti,Wireless,Access point,product,not-a-number,150,5");

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain("Row 2");
  });

  it("rejects invalid item types", () => {
    const result = parsePriceImportCsv("supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days\nDisty,AP-1,Ubiquiti,Wireless,Access point,invalid,100,150,5");

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain("item_type");
  });

  it("keeps the sample CSV compatible with the parser", () => {
    const result = parsePriceImportCsv(samplePriceImportCsv);

    expect(result.errors).toEqual([]);
    expect(result.rows.map((row) => row.itemType)).toEqual(["labour", "labour", "service", "product"]);
  });

  it("parses currency and comma-formatted numbers", () => {
    expect(parseMoney("£280.06")).toBe(280.06);
    expect(parseMoney("£ 280.06")).toBe(280.06);
    expect(parseMoney("1,270.16")).toBe(1270.16);
    expect(parseMoney("£1,270.16")).toBe(1270.16);
  });

  it("skips blank rows and section rows", () => {
    const result = parsePriceImportCsv("supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days\n\nHardware,,,,,,,,\nDisty,AP-1,Ubiquiti,Wireless,Access point,product,100,150,5");

    expect(result.rows).toHaveLength(1);
    expect(result.skippedRows).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it("uses default markup when unit sell is blank", () => {
    const result = parsePriceImportCsv("supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days\nDisty,AP-1,Ubiquiti,Wireless,Access point,product,100,,");

    expect(result.rows[0].unitSell).toBe(130);
    expect(result.rows[0].usedDefaultMarkup).toBe(true);
    expect(result.defaultMarkupAppliedRows).toBe(1);
    expect(DEFAULT_PRICE_IMPORT_MARKUP_PERCENT).toBe(30);
  });

  it("skips blank SKU rows without making import fatal", () => {
    const result = parsePriceImportCsv("supplier,sku,manufacturer,category,description,item_type,unit_cost,unit_sell,lead_time_days\nDisty,,Ubiquiti,Wireless,Access point,product,100,150,5\nDisty,AP-1,Ubiquiti,Wireless,Access point,product,100,150,5");

    expect(result.rows).toHaveLength(1);
    expect(result.skippedRows).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it("supports flexible column aliases and default item type", () => {
    const result = parsePriceImportCsv("supplier,part no,part no description,cost_price,sales_price\nDisty,AP-1,Access point,\"£1,270.16\",\"£1,650.00\"");

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      sku: "AP-1",
      description: "Access point",
      category: "Uncategorised",
      itemType: "product",
      unitCost: 1270.16,
      unitSell: 1650
    });
  });

  it("continues parsing valid rows when some rows fail", () => {
    const result = parsePriceImportCsv("supplier,sku,description,item_type,unit_cost,unit_sell\nDisty,AP-1,Access point,product,100,150\nDisty,AP-2,Access point,invalid,100,150\nDisty,AP-3,Access point,product,200,");

    expect(result.rows.map((row) => row.sku)).toEqual(["AP-1", "AP-3"]);
    expect(result.errors).toHaveLength(1);
    expect(result.defaultMarkupAppliedRows).toBe(1);
  });
});
