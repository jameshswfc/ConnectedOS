import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listPurchaseOrders } from "@/modules/procurement/procurement-service";
import { ModuleStatusBadge, formatModuleDate, formatModuleMoney } from "@/modules/operations/ui/module-ui";

export default async function PurchaseOrdersPage() {
  const { context, userName } = await getCrmPageContext();
  let purchaseOrders: Awaited<ReturnType<typeof listPurchaseOrders>> | null = null;
  try {
    purchaseOrders = await listPurchaseOrders(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!purchaseOrders) return <AppShell title="Purchase Orders" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Purchase Orders" userName={userName}>
      <div className="mb-4 flex justify-end"><Link href="/procurement/purchase-orders/new"><Button>Create Purchase Order</Button></Link></div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Project</TableHead><TableHead>Total</TableHead><TableHead>Expected Delivery</TableHead></TableRow></TableHeader><TableBody>
          {purchaseOrders.map((po) => <TableRow key={po.id}><TableCell><Link href={`/procurement/purchase-orders/${po.id}`} className="font-medium text-brand-700">{po.poNumber}</Link></TableCell><TableCell>{po.supplier.name}</TableCell><TableCell><ModuleStatusBadge value={po.status} /></TableCell><TableCell>{po.project?.name ?? "-"}</TableCell><TableCell>{formatModuleMoney(po.totalAmount, po.currency)}</TableCell><TableCell>{formatModuleDate(po.expectedDeliveryDate)}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
