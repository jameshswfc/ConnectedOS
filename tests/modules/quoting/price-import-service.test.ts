import { describe, expect, it } from "vitest";
import { parsePriceImportCsv } from "@/modules/quoting/price-imports/price-import-parser";
import { buildPriceImportSummary } from "@/modules/quoting/price-imports/price-import-service";

describe("price import service summary", () => {
  it("summarises errors for UI without dumping every error as the primary list", () => {
    const parsed = parsePriceImportCsv("supplier,sku,description,unit_cost,unit_sell\nDisty,AP-1,Access point,100,");
    const errors = Array.from({ length: 25 }, (_, index) => `Row ${index + 1}: bad row`);
    const summary = buildPriceImportSummary(parsed, 1, errors);

    expect(summary.importedRows).toBe(1);
    expect(summary.firstErrors).toHaveLength(20);
    expect(summary.errorsTruncated).toBe(true);
    expect(summary.allErrors).toHaveLength(25);
    expect(summary.notes).toContain("Rows with no sell price were imported using 30% default markup.");
  });
});
