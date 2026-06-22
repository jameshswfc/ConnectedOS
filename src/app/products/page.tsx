import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listProducts } from "@/modules/quoting/products/product-service";
import { formatQuoteMoney, formatQuotePercent, labelFromQuoteValue } from "@/modules/quoting/ui/quote-format";

type PageProps = { searchParams?: Promise<{ search?: string }> };

export default async function ProductsPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const products = await listProducts(context, resolvedSearchParams?.search);
  return (
    <AppShell title="Products" userName={userName}>
      <div className="mb-4 flex justify-between gap-3"><form className="flex gap-2"><input name="search" defaultValue={resolvedSearchParams?.search} placeholder="Search products" className="h-10 rounded-md border border-slate-300 px-3 text-sm" /><Button type="submit" variant="secondary">Search</Button></form><Link href="/products/new"><Button>Create Product</Button></Link></div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Type</TableHead><TableHead>Supplier</TableHead><TableHead>Manufacturer</TableHead><TableHead>Description</TableHead><TableHead>Cost</TableHead><TableHead>Sell</TableHead><TableHead>Margin</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{products.map((product) => <TableRow key={product.id}><TableCell>{product.sku}</TableCell><TableCell>{labelFromQuoteValue(product.itemType)}</TableCell><TableCell>{product.supplier}</TableCell><TableCell>{product.manufacturer}</TableCell><TableCell>{product.description}</TableCell><TableCell>{formatQuoteMoney(product.costPrice)}</TableCell><TableCell>{formatQuoteMoney(product.defaultSellPrice)}</TableCell><TableCell>{formatQuotePercent(product.marginPercent)}</TableCell><TableCell><Link href={`/products/${product.id}/edit`} className="font-medium text-brand-700">Edit</Link></TableCell></TableRow>)}</TableBody></Table></div>
    </AppShell>
  );
}
