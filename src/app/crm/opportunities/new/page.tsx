import { AppShell } from "@/components/layout/app-shell";
import { listAccounts } from "@/modules/crm/accounts/account-service";
import { canSelectSalesperson, getActiveSalesUsers } from "@/modules/crm/sales/salesperson-service";
import { CrmCreateForm, opportunitySourceOptions, opportunityStageOptions, opportunityTypeOptions } from "@/modules/crm/ui/crm-client-forms";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

export default async function NewOpportunityPage() {
  const { context, userName } = await getCrmPageContext();
  const [accounts, salespeople] = await Promise.all([
    listAccounts(context),
    canSelectSalesperson(context) ? getActiveSalesUsers() : Promise.resolve([])
  ]);
  const canAssign = canSelectSalesperson(context);
  return (
    <AppShell title="Create Opportunity" userName={userName}>
      <CrmCreateForm action="/api/v1/opportunities" redirectTo="/crm/opportunities" submitLabel="Create Opportunity" fields={[
        ...(canAssign ? [{ name: "ownerId", label: "Salesperson", type: "select" as const, required: true, options: salespeople.map((salesperson) => ({ value: salesperson.id, label: `${salesperson.displayName} (${salesperson.email})` })) }] : []),
        { name: "accountId", label: "Account", type: "select", required: true, options: accounts.map((account) => ({ value: account.id, label: account.name })) },
        { name: "opportunityName", label: "Opportunity name", required: true },
        { name: "opportunityType", label: "Opportunity type", type: "select", options: opportunityTypeOptions },
        { name: "stage", label: "Stage", type: "select", options: opportunityStageOptions },
        { name: "value", label: "Value", type: "number" },
        { name: "marginPercent", label: "Margin percent", type: "number" },
        { name: "expectedCloseDate", label: "Expected close date", type: "date" },
        { name: "source", label: "Source", type: "select", options: opportunitySourceOptions },
        { name: "nextActionDate", label: "Next action date", type: "date" },
        { name: "notes", label: "Notes", type: "textarea" }
      ]} />
    </AppShell>
  );
}
