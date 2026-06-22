import { describe, expect, it } from "vitest";
import { errorResponse, successResponse } from "@/lib/api-response";

describe("api response helpers", () => {
  it("returns the standard success response shape", () => {
    expect(successResponse({ id: "123" })).toEqual({
      success: true,
      data: { id: "123" },
      errors: []
    });
  });

  it("returns the standard error response shape", () => {
    expect(errorResponse("VALIDATION_ERROR", "Invalid input")).toEqual({
      success: false,
      data: null,
      errors: [{ code: "VALIDATION_ERROR", message: "Invalid input" }]
    });
  });
});
