"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";
import type { SerializableProduct } from "@/modules/quoting/products/product-serializer";
import { productMatchesSearch } from "@/modules/quoting/products/product-search";
import { catalogueItemToLineDefaults } from "@/modules/quoting/ui/quote-line-builder-utils";

type ProductsResponse = {
  data: SerializableProduct[] | null;
};

export function QuoteLineBuilder({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [lineType, setLineType] = useState("product");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [results, setResults] = useState<SerializableProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SerializableProduct | null>(null);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [unitSell, setUnitSell] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredResults = useMemo(() => {
    return results
      .filter((product) => product.itemType === lineType)
      .filter((product) => !category || product.category === category)
      .filter((product) => !manufacturer || product.manufacturer === manufacturer)
      .filter((product) => productMatchesSearch(product, query));
  }, [category, lineType, manufacturer, query, results]);

  const categories = [...new Set(results.filter((product) => product.itemType === lineType).map((product) => product.category))].sort();
  const manufacturers = [...new Set(results.filter((product) => product.itemType === lineType).map((product) => product.manufacturer))].sort();

  async function searchProducts(nextQuery: string) {
    setQuery(nextQuery);
    if (nextQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    const response = await fetch(`/api/v1/products?search=${encodeURIComponent(nextQuery)}`);
    if (!response.ok) return;
    const payload = (await response.json()) as ProductsResponse;
    setResults(payload.data ?? []);
  }

  function selectProduct(product: SerializableProduct) {
    const defaults = catalogueItemToLineDefaults(product);
    setSelectedProduct(product);
    setLineType(defaults.lineType);
    setDescription(defaults.description);
    setQuantity(defaults.quantity);
    setUnitCost(defaults.unitCost);
    setUnitSell(defaults.unitSell);
    setQuery(`${product.description} ${product.sku}`);
  }

  async function handleSubmit() {
    setError(null);
    const payload = {
      lineType,
      productId: selectedProduct?.id,
      description,
      quantity,
      unitCost,
      unitSell
    };
    const response = await fetch(`/api/v1/quote-versions/${versionId}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Line could not be added."));
      return;
    }
    setSelectedProduct(null);
    setQuery("");
    setResults([]);
    setDescription("");
    setQuantity("1");
    setUnitCost("");
    setUnitSell("");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <label className="block text-sm font-medium text-slate-700">
        Catalogue item search
        <input value={query} onChange={(event) => searchProducts(event.target.value)} placeholder="Search description, SKU, supplier, manufacturer or category" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Manufacturer
          <select value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All manufacturers</option>
            {manufacturers.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
        {query.trim().length < 2 ? <p className="p-3 text-sm text-slate-500">Type at least two characters to search catalogue items.</p> : null}
        {query.trim().length >= 2 && filteredResults.length === 0 ? <p className="p-3 text-sm text-amber-700">No catalogue items found. Upload products, labour or services from Price Imports.</p> : null}
        {filteredResults.map((product) => (
          <button key={product.id} type="button" onClick={() => selectProduct(product)} className="block w-full border-b border-slate-100 p-3 text-left text-sm hover:bg-slate-50">
            <span className="block font-medium text-slate-900">{product.description}</span>
            <span className="block text-xs text-slate-500">{product.sku} | {product.manufacturer} | {product.supplier} | {product.category} | {product.itemType} | Cost £{product.costPrice.toFixed(2)} | Sell £{product.defaultSellPrice.toFixed(2)}</span>
          </button>
        ))}
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Line type
        <select value={lineType} onChange={(event) => setLineType(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
          <option value="product">Product</option>
          <option value="labour">Labour</option>
          <option value="service">Service</option>
          <option value="note">Note</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Description
        <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
      </label>
      {lineType !== "note" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Quantity
            <input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" min="1" step="1" inputMode="numeric" pattern="[0-9]*" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Unit cost
            <input value={unitCost} onChange={(event) => setUnitCost(event.target.value)} type="number" step="0.01" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Unit sell
            <input value={unitSell} onChange={(event) => setUnitSell(event.target.value)} type="number" step="0.01" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
          </label>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="button" onClick={handleSubmit} disabled={lineType !== "note" && !selectedProduct}>Add Line</Button>
    </div>
  );
}
