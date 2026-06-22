import { describe, expect, it } from "vitest";
import { filterContactsByAccount, filterOpportunitiesByAccount, initialQuoteCreateSelection } from "@/modules/quoting/ui/quote-create-form-utils";

const accounts = [
  { id: "account-demo", name: "Connected Hospitality Demo Account" },
  { id: "account-hotel", name: "Grand Hotel Customer" }
];

const opportunities = [
  { id: "opp-demo", opportunityName: "Demo Opportunity", accountId: "account-demo", accountName: "Connected Hospitality Demo Account" },
  { id: "opp-hotel", opportunityName: "Grand Hotel WiFi", accountId: "account-hotel", accountName: "Grand Hotel Customer" }
];

const contacts = [
  { id: "contact-demo", accountId: "account-demo", name: "Demo Contact" },
  { id: "contact-hotel", accountId: "account-hotel", name: "Alex Morgan" }
];

describe("quote creation option filtering", () => {
  it("preselects the account from a launched opportunity", () => {
    expect(initialQuoteCreateSelection({ accounts, opportunities, selectedOpportunityId: "opp-hotel" })).toEqual({
      accountId: "account-hotel",
      opportunityId: "opp-hotel"
    });
  });

  it("filters opportunities by selected account", () => {
    expect(filterOpportunitiesByAccount(opportunities, "account-hotel")).toEqual([opportunities[1]]);
  });

  it("filters contacts by selected account", () => {
    expect(filterContactsByAccount(contacts, "account-hotel")).toEqual([contacts[1]]);
  });

  it("does not force the Connected Hospitality demo account when a real account is selected", () => {
    const selected = initialQuoteCreateSelection({ accounts: [accounts[1], accounts[0]], opportunities });

    expect(selected.accountId).toBe("account-hotel");
    expect(selected.opportunityId).toBe("opp-hotel");
    expect(selected.accountId).not.toBe("account-demo");
  });
});
