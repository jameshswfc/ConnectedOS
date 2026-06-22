import { describe, expect, it } from "vitest";
import { serializeAuditValue, summarizeAuditValue } from "@/services/audit/audit-service";

describe("audit service helpers", () => {
  it("summarizes plain objects for audit tables", () => {
    expect(
      summarizeAuditValue({
        status: "approved",
        invoiceNumber: "INV-2026-0001",
        amount: 1250
      })
    ).toContain("status: approved");
  });

  it("returns null for empty values", () => {
    expect(summarizeAuditValue(null)).toBeNull();
    expect(summarizeAuditValue("text")).toBeNull();
  });

  it("serializes dates and Decimal-like values into JSON-safe audit data", () => {
    const decimalLike = {
      constructor: { name: "Decimal" },
      toNumber: () => 12.5
    };

    expect(serializeAuditValue({
      happenedAt: new Date("2026-06-22T10:00:00.000Z"),
      amount: decimalLike,
      nested: [{ days: decimalLike }]
    })).toEqual({
      happenedAt: "2026-06-22T10:00:00.000Z",
      amount: 12.5,
      nested: [{ days: 12.5 }]
    });
  });
});
