import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getSupplier } from "@/modules/procurement/procurement-service";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditSupplierPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("procurement.create") && context.permissionLevel !== "administrator") {
    return <AppShell title="Edit Supplier" userName={userName}><AccessDenied /></AppShell>;
  }
  const { id } = await params;
  const [supplier, accounts] = await Promise.all([
    getSupplier(context, id),
    prisma.account.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);

  return (
    <AppShell title={`Edit ${supplier.name}`} userName={userName}>
      <JsonActionForm
        endpoint={`/api/v1/suppliers/${supplier.id}`}
        method="PATCH"
        buttonLabel="Save Supplier"
        successHref={`/procurement/suppliers/${supplier.id}`}
        fields={[
          { name: "name", label: "Supplier name", required: true, defaultValue: supplier.name },
          { name: "accountId", label: "Linked account", type: "select", options: accounts.map((account) => ({ id: account.id, label: account.name })), defaultValue: supplier.accountId ?? "" },
          { name: "contactName", label: "Contact name", defaultValue: supplier.contactName ?? "" },
          { name: "email", label: "Email", type: "email", defaultValue: supplier.email ?? "" },
          { name: "phone", label: "Phone", defaultValue: supplier.phone ?? "" },
          { name: "address", label: "Address", type: "textarea", defaultValue: supplier.address ?? "" },
          { name: "accountManager", label: "Account manager", defaultValue: supplier.accountManager ?? "" },
          { name: "paymentTerms", label: "Payment terms", defaultValue: supplier.paymentTerms ?? "" },
          { name: "categoriesSupplied", label: "Categories supplied", type: "textarea", defaultValue: supplier.categoriesSupplied ?? "" },
          { name: "defaultCurrency", label: "Currency", defaultValue: supplier.defaultCurrency },
          { name: "active", label: "Active", type: "checkbox", defaultValue: supplier.active ? "true" : "" },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: supplier.notes ?? "" }
        ]}
      />
    </AppShell>
  );
}
