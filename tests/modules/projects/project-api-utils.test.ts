import { describe, expect, it } from "vitest";
import { handleProjectApiError } from "@/modules/projects/api/project-api-utils";

describe("project api utils", () => {
  it("returns a friendly validation error for invalid task date updates", async () => {
    const response = handleProjectApiError(new Error("Unable to update task dates. Please check the dates and try again."));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errors: [{ code: "VALIDATION_ERROR", message: "Unable to update task dates. Please check the dates and try again." }]
    });
  });

  it("returns a friendly validation error for missing actual days on completion", async () => {
    const response = handleProjectApiError(new Error("Actual days used are required before completing this task."));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errors: [{ code: "VALIDATION_ERROR", message: "Actual days used are required before completing this task." }]
    });
  });
});
