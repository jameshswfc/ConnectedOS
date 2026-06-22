import type { SerializableProduct } from "@/modules/quoting/products/product-serializer";

export function catalogueItemToLineDefaults(product: SerializableProduct) {
  return {
    lineType: product.itemType,
    description: product.description,
    quantity: "1",
    unitCost: String(product.costPrice),
    unitSell: String(product.defaultSellPrice)
  };
}
