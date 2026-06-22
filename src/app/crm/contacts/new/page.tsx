import { AppShell } from "@/components/layout/app-shell";
import { listAccounts } from "@/modules/crm/accounts/account-service";
import { CrmCreateForm, relationshipStrengthOptions } from "@/modules/crm/ui/crm-client-forms";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

export default async function NewContactPage() {
  const { context, userName } = await getCrmPageContext();
  const accounts = await listAccounts(context);
  return (
    <AppShell title="Create Contact" userName={userName}>
      <CrmCreateForm action="/api/v1/contacts" redirectTo="/crm/contacts" submitLabel="Create Contact" fields={[
        { name: "accountId", label: "Account", type: "select", required: true, options: accounts.map((account) => ({ value: account.id, label: account.name })) },
        { name: "firstName", label: "First name", required: true },
        { name: "lastName", label: "Last name", required: true },
        { name: "jobTitle", label: "Job title" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone" },
        { name: "mobile", label: "Mobile" },
        { name: "linkedinUrl", label: "LinkedIn URL" },
        { name: "relationshipStrength", label: "Relationship strength", type: "select", options: relationshipStrengthOptions },
        { name: "notes", label: "Notes", type: "textarea" }
      ]} />
    </AppShell>
  );
}
