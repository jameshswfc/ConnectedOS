import { describe, expect, it } from "vitest";
import { handleUserApiError } from "@/services/users/user-api-utils";

describe("user API errors", () => {
  it("keeps unauthorised API responses as 403 JSON", async () => {
    const response = handleUserApiError(new Error("Missing permission: admin.users"));

    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      errors: [
        {
          code: "FORBIDDEN",
          message: "Missing permission: admin.users"
        }
      ]
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
