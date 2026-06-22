import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listPurchaseOrders, listSuppliers } from "@/modules/procurement/procurement-service";
import { ModuleMetricCard, ModuleStatusBadge, formatModuleDate, formatModuleMoney } from "@/modules/operations/ui/module-ui";

export default async function ProcurementPage() {
  const { context, userName } = await getCrmPageContext();
  let data: [Awaited<ReturnType<typeof listPurchaseOrders>>, Awaited<ReturnType<typeof listSuppliers>>] | null = null;
  try {
    data = await Promise.all([listPurchaseOrders(context), listSuppliers(context)]);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!data) return <AppShell title="Procurement" userName={userName}><AccessDenied /></AppShell>;
  const [purchaseOrders, suppliers] = data;
  return (
    <AppShell title="Procurement" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Link href="/procurement/suppliers"><Button variant="secondary">Suppliers</Button></Link>
          <Link href="/procurement/purchase-orders"><Button variant="secondary">Purchase Orders</Button></Link>
        </div>
        <div className="flex gap-2">
          <Link href="/procurement/suppliers/new"><Button variant="secondary">New Supplier</Button></Link>
          <Link href="/procurement/purchase-orders/new"><Button>New PO</Button></Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <ModuleMetricCard title="Suppliers" value={suppliers.length} />
        <ModuleMetricCard title="Open POs" value={purchaseOrders.filter((po) => !["received", "cancelled", "paid"].includes(po.status)).length} />
        <ModuleMetricCard title="Awaiting approval" value={purchaseOrders.filter((po) => po.status === "submitted").length} />
        <ModuleMetricCard title="Committed cost" value={formatModuleMoney(purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0))} />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Expected Delivery</TableHead></TableRow></TableHeader><TableBody>
          {purchaseOrders.map((po) => <TableRow key={po.id}><TableCell><Link href={`/procurement/purchase-orders/${po.id}`} className="font-medium text-brand-700">{po.poNumber}</Link></TableCell><TableCell>{po.supplier.name}</TableCell><TableCell>{po.project?.name ?? "-"}</TableCell><TableCell><ModuleStatusBadge value={po.status} /></TableCell><TableCell>{formatModuleMoney(po.totalAmount, po.currency)}</TableCell><TableCell>{formatModuleDate(po.expectedDeliveryDate)}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
