export type SerializableProduct = {
  id: string;
  sku: string;
  supplier: string;
  manufacturer: string;
  category: string;
  description: string;
  itemType: string;
  costPrice: number;
  defaultSellPrice: number;
  marginPercent: number;
  leadTimeDays: number | null;
};

export function serializeProduct(product: {
  id: string;
  sku: string;
  supplier: string;
  manufacturer: string;
  category: string;
  description: string;
  itemType: string;
  costPrice: unknown;
  defaultSellPrice: unknown;
  marginPercent: unknown;
  leadTimeDays: number | null;
}): SerializableProduct {
  return {
    id: product.id,
    sku: product.sku,
    supplier: product.supplier,
    manufacturer: product.manufacturer,
    category: product.category,
    description: product.description,
    itemType: product.itemType,
    costPrice: Number(product.costPrice),
    defaultSellPrice: Number(product.defaultSellPrice),
    marginPercent: Number(product.marginPercent),
    leadTimeDays: product.leadTimeDays
  };
}
