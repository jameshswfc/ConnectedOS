import { describe, expect, it } from "vitest";
import { getQuoteExportActions } from "@/modules/quoting/ui/quote-export-buttons";

describe("quote export buttons", () => {
  it("uses the approved export labels and hides long-form PDF", () => {
    const actions = getQuoteExportActions("quote-1", "version-1");

    expect(actions.map((action) => action.label)).toEqual(["Export Quote", "Export Proposal", "Export Quote Excel", "Export Internal"]);
    expect(actions.map((action) => action.href)).toEqual([
      "/api/v1/quotes/quote-1/versions/version-1/exports/pdf",
      "/api/v1/quotes/quote-1/versions/version-1/exports/long-proposal-pptx",
      "/api/v1/quotes/quote-1/versions/version-1/exports/excel-bom",
      "/api/v1/quotes/quote-1/versions/version-1/exports/internal-margin-sheet"
    ]);
    expect(actions.some((action) => action.label.includes("PDF"))).toBe(false);
    expect(actions.some((action) => action.href.includes("long-proposal-pdf"))).toBe(false);
  });
});
