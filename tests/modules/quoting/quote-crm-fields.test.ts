import { describe, expect, it } from "vitest";
import { deriveQuoteCrmFields } from "@/modules/quoting/quotes/quote-service";

describe("quote CRM field derivation", () => {
  it("uses the selected opportunity account instead of a hardcoded account", () => {
    const fields = deriveQuoteCrmFields({
      accountId: "account-real-hotel",
      account: { name: "Grand Hotel Customer" }
    });

    expect(fields.accountId).toBe("account-real-hotel");
    expect(fields.customerName).toBe("Grand Hotel Customer");
    expect(fields.customerName).not.toBe("Connected Hospitality");
  });
});
