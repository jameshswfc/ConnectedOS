import { describe, expect, it } from "vitest";
import { authOptions, resolveAuthRedirect } from "@/lib/auth";

describe("auth redirects", () => {
  it("preserves the current localhost port for callback redirects", () => {
    expect(resolveAuthRedirect("http://localhost:3002/dashboard", "http://localhost:3000")).toBe("http://localhost:3002/dashboard");
  });

  it("keeps relative redirects on the auth base URL", () => {
    expect(resolveAuthRedirect("/login", "http://localhost:3002")).toBe("http://localhost:3002/login");
  });

  it("rejects redirects to a different host", () => {
    expect(resolveAuthRedirect("https://example.com/dashboard", "http://localhost:3002")).toBe("http://localhost:3002");
  });

  it("uses local login as the default credentials provider", () => {
    expect(authOptions.providers.some((provider) => provider.id === "credentials")).toBe(true);
    expect(authOptions.providers.some((provider) => provider.id === "azure-ad")).toBe(false);
  });
});
