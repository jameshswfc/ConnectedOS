import { AuditPanel } from "@/components/audit/audit-panel";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionButton } from "@/components/forms/json-action-form";
import { MultipartActionForm } from "@/components/forms/multipart-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getPurchaseOrder } from "@/modules/procurement/procurement-service";
import { ModuleDetailGrid, ModuleStatusBadge, formatModuleDate, formatModuleMoney } from "@/modules/operations/ui/module-ui";
import Link from "next/link";

type Params = { params: Promise<{ id: string }> };
export default async function PurchaseOrderDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let po: Awaited<ReturnType<typeof getPurchaseOrder>> | null = null;
  try {
    po = await getPurchaseOrder(context, id);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!po) return <AppShell title="Purchase Order" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title={po.poNumber} userName={userName}>
      <Card>
        <CardHeader><CardTitle>Purchase Order Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ModuleDetailGrid items={[
            { label: "Supplier", value: po.supplierName ?? po.supplier.name },
            { label: "Supplier Address", value: po.supplierAddress ?? po.supplier.address ?? "-" },
            { label: "Supplier Contact", value: po.supplierContactName ?? po.supplier.contactName ?? "-" },
            { label: "Supplier Contact Email", value: po.supplierContactEmail ?? po.supplier.email ?? "-" },
            { label: "Delivery Address", value: po.deliveryAddress ?? "-" },
            { label: "Project", value: po.project ? `${po.project.projectNumber} ${po.project.name}` : "-" },
            { label: "Quote", value: po.quote?.quoteNumber ?? "-" },
            { label: "Change Request", value: po.changeRequest?.title ?? "-" },
            { label: "Status", value: po.status.replaceAll("_", " ") },
            { label: "Delivery Date", value: formatModuleDate(po.expectedDeliveryDate) },
            { label: "Subtotal", value: formatModuleMoney(po.subtotal, po.currency) },
            { label: "Tax", value: formatModuleMoney(po.vatAmount, po.currency) },
            { label: "Total", value: formatModuleMoney(po.totalAmount, po.currency) },
            { label: "Goods Receipts", value: po.goodsReceipts.length ? `${po.goodsReceipts.length} receipt(s)` : "Not received" },
            { label: "Notes", value: po.notes ?? "-" }
          ]} />
          <div className="flex flex-wrap gap-2">
            <ModuleStatusBadge value={po.status} />
            <JsonActionButton endpoint={`/api/v1/purchase-orders/${po.id}`} method="PATCH" body={{ status: "submitted" }} label="Submit" />
            <JsonActionButton endpoint={`/api/v1/purchase-orders/${po.id}`} method="PATCH" body={{ status: "approved" }} label="Approve" />
            <JsonActionButton endpoint={`/api/v1/purchase-orders/${po.id}`} method="PATCH" body={{ status: "ordered" }} label="Mark Ordered" variant="secondary" />
            <JsonActionButton endpoint={`/api/v1/purchase-orders/${po.id}/receive`} method="POST" label="Receive Goods" variant="secondary" />
            <a href={`/api/v1/purchase-orders/${po.id}/pdf`} className="inline-flex h-10 items-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white">Export PO PDF</a>
            {po.projectId ? <Link href={`/projects/${po.projectId}`} className="inline-flex h-10 items-center rounded-md border border-brand-100 bg-white px-4 text-sm font-medium text-brand-900">Open Project</Link> : null}
            {po.quoteId ? <Link href={`/quotes/${po.quoteId}`} className="inline-flex h-10 items-center rounded-md border border-brand-100 bg-white px-4 text-sm font-medium text-brand-900">Open Quote</Link> : null}
          </div>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>PO Lines</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead>SKU</TableHead><TableHead>Manufacturer</TableHead><TableHead>Qty</TableHead><TableHead>Unit Cost</TableHead><TableHead>Line Total</TableHead><TableHead>Tax %</TableHead><TableHead>Tax Amount</TableHead><TableHead>Total Inc Tax</TableHead></TableRow></TableHeader><TableBody>
            {po.lines.map((line) => <TableRow key={line.id}><TableCell>{line.description}</TableCell><TableCell>{line.sku ?? "-"}</TableCell><TableCell>{line.manufacturer ?? "-"}</TableCell><TableCell>{line.quantity.toString()}</TableCell><TableCell>{formatModuleMoney(line.unitCost, po.currency)}</TableCell><TableCell>{formatModuleMoney(line.totalCost, po.currency)}</TableCell><TableCell>{Number(line.taxRate).toFixed(0)}%</TableCell><TableCell>{formatModuleMoney(line.taxAmount, po.currency)}</TableCell><TableCell>{formatModuleMoney(line.totalIncludingTax, po.currency)}</TableCell></TableRow>)}
          </TableBody></Table>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Supplier Invoices</CardTitle></CardHeader>
        <CardContent>
          {po.supplierInvoices.length ? (
            <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Due</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {po.supplierInvoices.map((invoice) => <TableRow key={invoice.id}><TableCell>{invoice.invoiceNumber}</TableCell><TableCell>{formatModuleDate(invoice.invoiceDate)}</TableCell><TableCell>{formatModuleDate(invoice.dueDate)}</TableCell><TableCell>{formatModuleMoney(invoice.amount, po.currency)}</TableCell><TableCell>{invoice.status.replaceAll("_", " ")}</TableCell></TableRow>)}
            </TableBody></Table>
          ) : <p className="text-sm text-slate-500">No supplier invoices attached yet.</p>}
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Add Supplier Invoice</CardTitle></CardHeader>
        <CardContent>
          <MultipartActionForm
            endpoint={`/api/v1/purchase-orders/${po.id}/invoices`}
            buttonLabel="Attach Supplier Invoice"
            fields={[
              { name: "invoiceNumber", label: "Invoice number", required: true },
              { name: "invoiceDate", label: "Invoice date", type: "date", required: true },
              { name: "dueDate", label: "Due date", type: "date" },
              { name: "amount", label: "Amount", type: "number", required: true },
              { name: "file", label: "Invoice file", accept: ".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv,.txt" }
            ]}
          />
        </CardContent>
      </Card>
      <AuditPanel module="procurement" entityType="PurchaseOrder" entityId={po.id} />
    </AppShell>
  );
}
