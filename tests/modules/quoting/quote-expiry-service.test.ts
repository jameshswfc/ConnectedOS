import { describe, expect, it } from "vitest";
import { quoteExpiryCutoff, shouldExpireSentQuote } from "@/modules/quoting/quotes/quote-expiry-service";

describe("quote expiry service", () => {
  const now = new Date("2026-06-08T12:00:00.000Z");

  it("keeps a 29 day sent quote as sent", () => {
    expect(shouldExpireSentQuote(new Date("2026-05-10T12:00:01.000Z"), now)).toBe(false);
  });

  it("expires a 30 day sent quote", () => {
    expect(shouldExpireSentQuote(new Date("2026-05-09T12:00:00.000Z"), now)).toBe(true);
  });

  it("uses a 30 day expiry cutoff", () => {
    expect(quoteExpiryCutoff(now).toISOString()).toBe("2026-05-09T12:00:00.000Z");
  });
});
