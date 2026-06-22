import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit/audit-service";
import { calculateProductMarginPercent } from "@/modules/quoting/quotes/quote-calculations";
import { buildProductSearchWhere } from "@/modules/quoting/products/product-search";
import { assertQuotePermission, productVisibilityWhere } from "@/modules/quoting/quotes/quote-permissions";
import type { ProductCreateInput, ProductUpdateInput } from "@/modules/quoting/schemas/quoting-schemas";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function listProducts(_context: CrmAccessContext, search?: string) {
  return prisma.product.findMany({
    where: {
      AND: [
        productVisibilityWhere(),
        buildProductSearchWhere(search)
      ]
    },
    orderBy: [{ supplier: "asc" }, { sku: "asc" }]
  });
}

export function productSupplierSkuKey(supplier: string, sku: string) {
  return {
    supplier_sku: {
      supplier,
      sku
    }
  };
}

export async function getProduct(_context: CrmAccessContext, id: string) {
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) throw new Error("Product not found");
  return product;
}

export async function createProduct(context: CrmAccessContext, input: ProductCreateInput) {
  assertQuotePermission(context, "quotes.update");
  const linkedSupplier = input.supplierId
    ? await prisma.supplier.findFirst({ where: { id: input.supplierId, deletedAt: null, active: true } })
    : null;
  const product = await prisma.product.create({
    data: {
      ...input,
      supplier: linkedSupplier?.name ?? input.supplier,
      supplierId: linkedSupplier?.id ?? input.supplierId ?? null,
      marginPercent: calculateProductMarginPercent(input.costPrice, input.defaultSellPrice),
      createdById: context.userId,
      updatedById: context.userId
    }
  });
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Product", entityId: product.id, action: "create", newValue: product });
  return product;
}

export async function updateProduct(context: CrmAccessContext, id: string, input: ProductUpdateInput) {
  assertQuotePermission(context, "quotes.update");
  const previous = await getProduct(context, id);
  const linkedSupplier = input.supplierId
    ? await prisma.supplier.findFirst({ where: { id: input.supplierId, deletedAt: null, active: true } })
    : input.supplierId === null
      ? null
      : null;
  const costPrice = input.costPrice ?? Number(previous.costPrice);
  const defaultSellPrice = input.defaultSellPrice ?? Number(previous.defaultSellPrice);
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...input,
      supplier: linkedSupplier?.name ?? input.supplier ?? previous.supplier,
      supplierId: input.supplierId === undefined ? previous.supplierId : linkedSupplier?.id ?? null,
      marginPercent: calculateProductMarginPercent(costPrice, defaultSellPrice),
      updatedById: context.userId
    }
  });
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Product", entityId: product.id, action: "update", previousValue: previous, newValue: product });
  return product;
}

export async function softDeleteProduct(context: CrmAccessContext, id: string) {
  assertQuotePermission(context, "quotes.update");
  const previous = await getProduct(context, id);
  const product = await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: context.userId, updatedById: context.userId }
  });
  await createAuditLog({ userId: context.userId, module: "quoting", entityType: "Product", entityId: product.id, action: "soft_delete", previousValue: previous, newValue: product });
  return product;
}
