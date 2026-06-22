import { AppShell } from "@/components/layout/app-shell";
import { listAccounts } from "@/modules/crm/accounts/account-service";
import { listContacts } from "@/modules/crm/contacts/contact-service";
import { listOpportunities } from "@/modules/crm/opportunities/opportunity-service";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { QuoteCreateForm } from "@/modules/quoting/ui/quote-create-form";

type PageProps = { searchParams?: Promise<{ opportunityId?: string }> };

export default async function NewQuotePage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const [accounts, opportunities, contacts] = await Promise.all([
    listAccounts(context),
    listOpportunities(context),
    listContacts(context)
  ]);
  return (
    <AppShell title="Create Quote" userName={userName}>
      <QuoteCreateForm
        selectedOpportunityId={resolvedSearchParams?.opportunityId}
        accounts={accounts.map((account) => ({
          id: account.id,
          name: account.name
        }))}
        opportunities={opportunities.map((opportunity) => ({
          id: opportunity.id,
          opportunityName: opportunity.opportunityName,
          accountId: opportunity.accountId,
          accountName: opportunity.account.name
        }))}
        contacts={contacts.map((contact) => ({
          id: contact.id,
          accountId: contact.accountId,
          name: `${contact.firstName} ${contact.lastName}`
        }))}
      />
    </AppShell>
  );
}
