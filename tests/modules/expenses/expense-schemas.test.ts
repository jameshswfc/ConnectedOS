import { describe, expect, it } from "vitest";
import { expenseLineCreateSchema } from "@/modules/expenses/expense-schemas";

describe("expense schemas", () => {
  it("parses mileage line values", () => {
    const result = expenseLineCreateSchema.parse({
      expenseDate: "2026-06-14",
      category: "mileage",
      description: "Airport run",
      amount: "0",
      mileageMiles: "12.5",
      mileageRate: "0.45"
    });

    expect(result.mileageMiles).toBe(12.5);
    expect(result.mileageRate).toBe(0.45);
    expect(result.expenseDate).toBeInstanceOf(Date);
  });
});
