import { AssetStatus } from "@prisma/client";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

export default async function NewAssetPage() {
  const { context, userName } = await getCrmPageContext();
  if (!context.permissions.includes("assets.create") && context.permissionLevel !== "administrator") {
    return <AppShell title="New Asset" userName={userName}><AccessDenied /></AppShell>;
  }
  const [projects, accounts, products] = await Promise.all([
    prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, projectNumber: true } }),
    prisma.account.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { deletedAt: null }, orderBy: { description: "asc" }, select: { id: true, description: true, sku: true } })
  ]);
  return (
    <AppShell title="New Asset" userName={userName}>
      <JsonActionForm
        endpoint="/api/v1/assets"
        buttonLabel="Create Asset"
        successHref="/assets/:id"
        fields={[
          { name: "projectId", label: "Project", type: "select", options: projects.map((project) => ({ id: project.id, label: `${project.projectNumber} ${project.name}` })) },
          { name: "accountId", label: "Account", type: "select", options: accounts.map((account) => ({ id: account.id, label: account.name })) },
          { name: "productId", label: "Product", type: "select", options: products.map((product) => ({ id: product.id, label: `${product.sku ?? "-"} ${product.description}` })) },
          { name: "sku", label: "SKU" },
          { name: "manufacturer", label: "Manufacturer" },
          { name: "model", label: "Model" },
          { name: "serialNumber", label: "Serial number" },
          { name: "macAddress", label: "MAC address" },
          { name: "description", label: "Description" },
          { name: "status", label: "Status", type: "select", options: Object.values(AssetStatus).map((value) => ({ id: value, label: value.replaceAll("_", " ") })), defaultValue: AssetStatus.required },
          { name: "location", label: "Location" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
