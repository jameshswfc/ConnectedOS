import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiAuthError } from "@/services/auth/api-auth-error";
import { documentApiError } from "@/services/documents/document-api-error";

describe("document and intake API errors", () => {
  it("preserves JSON unauthenticated responses", async () => {
    const response = documentApiError(new ApiAuthError("UNAUTHENTICATED", 401, "Sign in required."));
    expect(response.status).toBe(401); expect(response.headers.get("content-type")).toContain("application/json");
  });
  it("preserves JSON permission denials", async () => {
    const response = documentApiError(new Error("Missing permission: document routing administration"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { message: "You do not have permission to perform this action." } });
  });
  it("returns validation fields without a runtime page", async () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: "bad" });
    const response = documentApiError(result.error);
    expect(response.status).toBe(400); expect((await response.json()).error.fields.email).toBeDefined();
  });
  it("does not expose internal failures on public responses", async () => {
    const response = documentApiError(new Error("database password and private path"), true);
    expect(response.status).toBe(500);
    const text = await response.text(); expect(text).not.toContain("password"); expect(text).not.toContain("private path");
  });
});
