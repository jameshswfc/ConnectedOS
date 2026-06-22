export type QuoteAccountOption = {
  id: string;
  name: string;
};

export type QuoteOpportunityOption = {
  id: string;
  opportunityName: string;
  accountId: string;
  accountName: string;
};

export type QuoteContactOption = {
  id: string;
  accountId: string;
  name: string;
};

export function initialQuoteCreateSelection({
  accounts,
  opportunities,
  selectedOpportunityId
}: {
  accounts: QuoteAccountOption[];
  opportunities: QuoteOpportunityOption[];
  selectedOpportunityId?: string;
}) {
  const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === selectedOpportunityId);
  const accountId = selectedOpportunity?.accountId ?? accounts[0]?.id ?? "";
  const opportunityId = selectedOpportunity?.id ?? opportunities.find((opportunity) => opportunity.accountId === accountId)?.id ?? "";
  return { accountId, opportunityId };
}

export function filterOpportunitiesByAccount(opportunities: QuoteOpportunityOption[], accountId: string) {
  return opportunities.filter((opportunity) => opportunity.accountId === accountId);
}

export function filterContactsByAccount(contacts: QuoteContactOption[], accountId: string) {
  return contacts.filter((contact) => contact.accountId === accountId);
}
