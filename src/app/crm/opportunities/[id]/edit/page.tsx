import { AppShell } from "@/components/layout/app-shell";
import { listAccounts } from "@/modules/crm/accounts/account-service";
import { listContacts } from "@/modules/crm/contacts/contact-service";
import { getOpportunity } from "@/modules/crm/opportunities/opportunity-service";
import { canSelectSalesperson, getActiveSalesUsers } from "@/modules/crm/sales/salesperson-service";
import { CrmCreateForm, opportunitySourceOptions, opportunityStageOptions, opportunityTypeOptions } from "@/modules/crm/ui/crm-client-forms";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditOpportunityPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const [opportunity, accounts, contacts, salespeople] = await Promise.all([
    getOpportunity(context, id),
    listAccounts(context),
    listContacts(context),
    canSelectSalesperson(context) ? getActiveSalesUsers() : Promise.resolve([])
  ]);
  const canAssign = canSelectSalesperson(context);

  return (
    <AppShell title={`Edit ${opportunity.opportunityName}`} userName={userName}>
      <CrmCreateForm
        action={`/api/v1/opportunities/${opportunity.id}`}
        redirectTo={`/crm/opportunities/${opportunity.id}`}
        method="PATCH"
        submitLabel="Save Opportunity"
        defaultValues={{
          accountId: opportunity.accountId,
          primaryContactId: opportunity.primaryContactId,
          ownerId: opportunity.ownerId,
          opportunityName: opportunity.opportunityName,
          opportunityType: opportunity.opportunityType,
          source: opportunity.source,
          stage: opportunity.stage,
          value: Number(opportunity.value),
          marginPercent: opportunity.marginPercent ? Number(opportunity.marginPercent) : undefined,
          expectedCloseDate: formatInputDate(opportunity.expectedCloseDate),
          nextActionDate: formatInputDate(opportunity.nextActionDate),
          competitor: opportunity.competitor,
          notes: opportunity.notes
        }}
        fields={[
          ...(canAssign ? [{ name: "ownerId", label: "Salesperson", type: "select" as const, required: true, options: salespeople.map((salesperson) => ({ value: salesperson.id, label: `${salesperson.displayName} (${salesperson.email})` })) }] : []),
          { name: "opportunityName", label: "Opportunity name", required: true },
          { name: "accountId", label: "Account", type: "select", required: true, options: accounts.map((account) => ({ value: account.id, label: account.name })) },
          { name: "primaryContactId", label: "Primary contact", type: "select", options: contacts.map((contact) => ({ value: contact.id, label: `${contact.firstName} ${contact.lastName}` })) },
          { name: "opportunityType", label: "Opportunity type", type: "select", options: opportunityTypeOptions },
          { name: "source", label: "Source", type: "select", options: opportunitySourceOptions },
          { name: "stage", label: "Stage", type: "select", options: opportunityStageOptions },
          { name: "value", label: "Value", type: "number" },
          { name: "marginPercent", label: "Margin percent", type: "number" },
          { name: "expectedCloseDate", label: "Expected close date", type: "date" },
          { name: "nextActionDate", label: "Next action date", type: "date" },
          { name: "competitor", label: "Competitor" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function formatInputDate(value: Date | null) {
  if (!value) return undefined;
  return value.toISOString().slice(0, 10);
}
