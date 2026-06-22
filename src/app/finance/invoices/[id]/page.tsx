import { AuditPanel } from "@/components/audit/audit-panel";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionForm } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listCustomerInvoices } from "@/modules/finance/finance-service";
import { ModuleDetailGrid, ModuleStatusBadge, formatModuleDate, formatModuleMoney } from "@/modules/operations/ui/module-ui";

type Params = { params: Promise<{ id: string }> };
export default async function InvoiceDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let invoices: Awaited<ReturnType<typeof listCustomerInvoices>> | null = null;
  try {
    invoices = await listCustomerInvoices(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  const invoice = invoices?.find((row) => row.id === id) ?? null;
  if (!invoice) return <AppShell title="Invoice" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title={invoice.invoiceNumber} userName={userName}>
      <Card>
        <CardHeader><CardTitle>Invoice Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ModuleDetailGrid items={[
            { label: "Account", value: invoice.account.name },
            { label: "Project", value: invoice.project?.name ?? "-" },
            { label: "Quote", value: invoice.quote?.quoteNumber ?? "-" },
            { label: "Issued", value: formatModuleDate(invoice.issueDate) },
            { label: "Due", value: formatModuleDate(invoice.dueDate) },
            { label: "Outstanding", value: formatModuleMoney(invoice.outstandingAmount, invoice.currency) }
          ]} />
          <ModuleStatusBadge value={invoice.status} />
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Record Payment</CardTitle></CardHeader>
        <CardContent>
          <JsonActionForm
            endpoint={`/api/v1/customer-invoices/${invoice.id}/payments`}
            buttonLabel="Record Payment"
            fields={[
              { name: "paymentDate", label: "Payment date", type: "date", required: true },
              { name: "amount", label: "Amount", type: "number", required: true },
              { name: "method", label: "Method" },
              { name: "reference", label: "Reference" },
              { name: "notes", label: "Notes", type: "textarea" }
            ]}
          />
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader><TableBody>
            {invoice.payments.map((payment) => <TableRow key={payment.id}><TableCell>{formatModuleDate(payment.paymentDate)}</TableCell><TableCell>{formatModuleMoney(payment.amount, invoice.currency)}</TableCell><TableCell>{payment.method ?? "-"}</TableCell><TableCell>{payment.reference ?? "-"}</TableCell></TableRow>)}
          </TableBody></Table>
        </CardContent>
      </Card>
      <AuditPanel module="finance" entityType="CustomerInvoice" entityId={invoice.id} />
    </AppShell>
  );
}
