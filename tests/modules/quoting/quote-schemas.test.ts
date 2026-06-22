import { describe, expect, it } from "vitest";
import { DEFAULT_QUOTE_TERMS } from "@/modules/quoting/quotes/quote-terms";
import { quoteCreateSchema, quoteLineCreateSchema, quoteVersionTermsUpdateSchema } from "@/modules/quoting/schemas/quoting-schemas";

describe("quote schemas", () => {
  const validQuote = {
    opportunityId: "00000000-0000-0000-0000-000000000001",
    contactId: "00000000-0000-0000-0000-000000000002",
    title: "Guest WiFi Refresh",
    highLevelScope: "Replace guest WiFi hardware and provide implementation services."
  };

  it("requires an opportunity", () => {
    expect(() => quoteCreateSchema.parse({ ...validQuote, opportunityId: undefined })).toThrow();
  });

  it("requires a contact", () => {
    expect(() => quoteCreateSchema.parse({ ...validQuote, contactId: undefined })).toThrow();
  });

  it("requires High Level Scope", () => {
    expect(() => quoteCreateSchema.parse({ ...validQuote, highLevelScope: "" })).toThrow();
  });

  it("does not accept free-text account/customer fields for quote creation", () => {
    const parsed = quoteCreateSchema.parse({ ...validQuote, customerName: "Manual customer", hotelName: "Manual hotel" });

    expect("customerName" in parsed).toBe(false);
    expect("hotelName" in parsed).toBe(false);
  });

  it("requires whole-number quote line quantities with minimum one", () => {
    const validLine = { lineType: "product", description: "Access Point", unitCost: 100, unitSell: 150 };

    expect(() => quoteLineCreateSchema.parse({ ...validLine, quantity: 1.5 })).toThrow();
    expect(() => quoteLineCreateSchema.parse({ ...validLine, quantity: 0 })).toThrow();
    expect(() => quoteLineCreateSchema.parse({ ...validLine, quantity: -1 })).toThrow();
    expect(quoteLineCreateSchema.parse({ ...validLine, quantity: 1 }).quantity).toBe(1);
    expect(quoteLineCreateSchema.parse({ ...validLine, quantity: 25 }).quantity).toBe(25);
  });

  it("applies and edits quote version terms", () => {
    expect(quoteVersionTermsUpdateSchema.parse({}).terms).toBe(DEFAULT_QUOTE_TERMS);
    expect(quoteVersionTermsUpdateSchema.parse({ terms: "Custom terms" }).terms).toBe("Custom terms");
    expect(() => quoteVersionTermsUpdateSchema.parse({ terms: "" })).toThrow();
  });
});
