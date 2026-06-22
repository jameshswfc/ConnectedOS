import { AppShell } from "@/components/layout/app-shell";
import { accountStatusOptions, accountTypeOptions, CrmCreateForm } from "@/modules/crm/ui/crm-client-forms";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

export default async function NewAccountPage() {
  const { userName } = await getCrmPageContext();
  return (
    <AppShell title="Create Account" userName={userName}>
      <CrmCreateForm
        action="/api/v1/accounts"
        redirectTo="/crm/accounts"
        submitLabel="Create Account"
        fields={[
          { name: "name", label: "Account name", required: true },
          { name: "accountType", label: "Type", type: "select", options: accountTypeOptions },
          { name: "status", label: "Status", type: "select", options: accountStatusOptions },
          { name: "website", label: "Website" },
          { name: "phone", label: "Phone" },
          { name: "city", label: "City" },
          { name: "country", label: "Country" },
          { name: "industry", label: "Industry" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
