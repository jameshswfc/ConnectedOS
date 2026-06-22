import { describe, expect, it } from "vitest";
import { buildProductionTestSeedDefinition } from "@/modules/testing/production-test-seed";

describe("production test seed definition", () => {
  it("uses stable unique identifiers for idempotent seeding", () => {
    const definition = buildProductionTestSeedDefinition();
    expect(new Set(definition.accountNames).size).toBe(definition.accountNames.length);
    expect(new Set(definition.quoteNumbers).size).toBe(definition.quoteNumbers.length);
    expect(new Set(definition.requestNumbers).size).toBe(definition.requestNumbers.length);
    expect(new Set(definition.poNumbers).size).toBe(definition.poNumbers.length);
    expect(new Set(definition.invoiceNumbers).size).toBe(definition.invoiceNumbers.length);
    expect(new Set(definition.assetNumbers).size).toBe(definition.assetNumbers.length);
    expect(new Set(definition.helpdeskTicketNumbers).size).toBe(definition.helpdeskTicketNumbers.length);
  });

  it("matches the promised production-test record counts", () => {
    const definition = buildProductionTestSeedDefinition();
    expect(definition.accountNames).toHaveLength(3);
    expect(definition.quoteNumbers).toHaveLength(3);
    expect(definition.requestNumbers).toHaveLength(2);
    expect(definition.projectQuoteNumbers).toHaveLength(2);
    expect(definition.poNumbers).toHaveLength(2);
    expect(definition.invoiceNumbers).toHaveLength(2);
    expect(definition.assetNumbers).toHaveLength(5);
    expect(definition.helpdeskTicketNumbers).toHaveLength(5);
  });
});
