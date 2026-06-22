import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { QuotingJsonForm } from "@/modules/quoting/ui/quoting-client-forms";

export default async function NewProductPage() {
  const { userName } = await getCrmPageContext();
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });
  return (
    <AppShell title="Create Product" userName={userName}>
      <QuotingJsonForm action="/api/v1/products" redirectTo="/products" submitLabel="Create Product" fields={productFields(suppliers)} />
    </AppShell>
  );
}

const productFields = (suppliers: Array<{ id: string; name: string }>) => [
  { name: "sku", label: "SKU", required: true },
  { name: "supplierId", label: "Linked Supplier", type: "select" as const, options: suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })) },
  { name: "supplier", label: "Supplier", required: true },
  { name: "manufacturer", label: "Manufacturer", required: true },
  { name: "category", label: "Category", required: true },
  { name: "itemType", label: "Item type", type: "select" as const, required: true, options: [{ value: "product", label: "Product" }, { value: "labour", label: "Labour" }, { value: "service", label: "Service" }] },
  { name: "description", label: "Description", type: "textarea" as const, required: true },
  { name: "costPrice", label: "Cost price", type: "number" as const, required: true },
  { name: "defaultSellPrice", label: "Default sell price", type: "number" as const, required: true },
  { name: "leadTimeDays", label: "Lead time days", type: "number" as const },
  { name: "isActive", label: "Active", type: "checkbox" as const }
];
