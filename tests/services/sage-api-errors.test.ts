import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiAuthError } from "@/services/auth/api-auth-error";
import { sageApiError, verifySageOrigin } from "@/services/integrations/sage/sage-api";
afterEach(() => vi.unstubAllEnvs());
describe("Sage and invoice API boundaries", () => {
  it("returns JSON 401 for an unauthenticated caller", async () => {
    const result = sageApiError(new ApiAuthError("UNAUTHENTICATED", 401, "Please sign in."));
    expect(result.status).toBe(401); expect(result.headers.get("content-type")).toContain("application/json");
    expect((await result.json()).success).toBe(false);
  });
  it("returns JSON 403 without exposing permission internals", async () => {
    const result = sageApiError(new Error("Missing permission: designated invoice approver"));
    expect(result.status).toBe(403); expect(JSON.stringify(await result.json())).not.toContain("designated");
  });
  it("rejects foreign or absent request origins", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://portal.example.com");
    expect(() => verifySageOrigin(new Request("https://portal.example.com/api", { headers: { origin: "https://foreign.example" } }))).toThrow("same-origin");
    expect(() => verifySageOrigin(new Request("https://portal.example.com/api"))).toThrow("same-origin");
    expect(() => verifySageOrigin(new Request("https://portal.example.com/api", { headers: { origin: "https://portal.example.com" } }))).not.toThrow();
  });
  it("returns field validation and masks unexpected provider/database errors", async () => {
    const parsed = z.string().min(5, "Please add a description.").safeParse("");
    const validation = sageApiError(parsed.error);
    expect(validation.status).toBe(400); expect(JSON.stringify(await validation.json())).toContain("Please add a description");
    const internal = sageApiError(new Error("database connection secret"));
    expect(internal.status).toBe(502); expect(JSON.stringify(await internal.json())).not.toContain("secret");
  });
});
