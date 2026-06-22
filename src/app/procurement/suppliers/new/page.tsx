import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

export default async function NewSupplierPage() {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("procurement.create") && context.permissionLevel !== "administrator") {
    return <AppShell title="New Supplier" userName={userName}><AccessDenied /></AppShell>;
  }
  const accounts = await prisma.account.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <AppShell title="New Supplier" userName={userName}>
      <JsonActionForm
        endpoint="/api/v1/suppliers"
        buttonLabel="Create Supplier"
        successHref="/procurement/suppliers"
        fields={[
          { name: "name", label: "Supplier name", required: true },
          { name: "accountId", label: "Linked account", type: "select", options: accounts.map((account) => ({ id: account.id, label: account.name })) },
          { name: "contactName", label: "Contact name" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone" },
          { name: "address", label: "Address", type: "textarea" },
          { name: "accountManager", label: "Account manager" },
          { name: "paymentTerms", label: "Payment terms" },
          { name: "categoriesSupplied", label: "Categories supplied", type: "textarea" },
          { name: "defaultCurrency", label: "Currency", defaultValue: "GBP" },
          { name: "active", label: "Active", type: "checkbox", defaultValue: "true" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
