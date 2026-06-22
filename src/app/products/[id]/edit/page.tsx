import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getProduct } from "@/modules/quoting/products/product-service";
import { QuotingJsonForm } from "@/modules/quoting/ui/quoting-client-forms";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const [product, suppliers] = await Promise.all([
    getProduct(context, id),
    prisma.supplier.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);
  return (
    <AppShell title={`Edit ${product.sku}`} userName={userName}>
      <QuotingJsonForm
        action={`/api/v1/products/${product.id}`}
        redirectTo="/products"
        method="PATCH"
        submitLabel="Save Product"
        defaultValues={{
          sku: product.sku,
          supplierId: product.supplierId ?? "",
          supplier: product.supplier,
          manufacturer: product.manufacturer,
          category: product.category,
          itemType: product.itemType,
          description: product.description,
          costPrice: Number(product.costPrice),
          defaultSellPrice: Number(product.defaultSellPrice),
          leadTimeDays: product.leadTimeDays,
          isActive: product.isActive
        }}
        fields={productFields(suppliers)}
      />
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
