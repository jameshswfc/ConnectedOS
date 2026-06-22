import type { Prisma } from "@prisma/client";

export type ProductSearchable = {
  sku: string;
  supplier: string;
  manufacturer: string;
  category: string;
  description: string;
  itemType: string;
};

export function productSearchTerms(search?: string) {
  return normalizeSearchText(search)
    .split(" ")
    .filter(Boolean);
}

export function buildProductSearchWhere(search?: string): Prisma.ProductWhereInput {
  const terms = databaseSearchTerms(search);
  if (terms.length === 0) return {};

  return {
    AND: terms.map((term) => ({
      OR: [
        { sku: { contains: term, mode: "insensitive" } },
        { supplier: { contains: term, mode: "insensitive" } },
        { manufacturer: { contains: term, mode: "insensitive" } },
        { category: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        ...itemTypeSearchWhere(term)
      ]
    }))
  };
}

export function productMatchesSearch(product: ProductSearchable, search?: string) {
  const terms = productSearchTerms(search);
  if (terms.length === 0) return true;
  const fields = [product.sku, product.supplier, product.manufacturer, product.category, product.description, product.itemType].map((value) => ({
    spaced: normalizeSearchText(value),
    compact: compactSearchText(value)
  }));
  return terms.every((term) => {
    const compactTerm = compactSearchText(term);
    const expandedTerms = expandAlphaNumericTerm(term);
    return fields.some((field) => field.spaced.includes(term) || field.compact.includes(compactTerm) || expandedTerms.every((part) => field.spaced.includes(part) || field.compact.includes(part)));
  });
}

function itemTypeSearchWhere(term: string): Prisma.ProductWhereInput[] {
  const itemTypes = ["product", "labour", "service"].filter((itemType) => itemType.includes(term));
  return itemTypes.map((itemType) => ({ itemType: itemType as "product" | "labour" | "service" }));
}

export function normalizeSearchText(value?: string) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactSearchText(value?: string) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function databaseSearchTerms(search?: string) {
  return [...new Set(productSearchTerms(search).flatMap(expandAlphaNumericTerm))];
}

function expandAlphaNumericTerm(term: string) {
  const match = term.match(/^([a-z]+)(\d+)$/);
  if (!match) return [term];
  return [match[1], match[2]];
}
