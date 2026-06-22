import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listCustomerInvoices } from "@/modules/finance/finance-service";
import { ModuleStatusBadge, formatModuleDate, formatModuleMoney } from "@/modules/operations/ui/module-ui";

export default async function FinanceInvoicesPage() {
  const { context, userName } = await getCrmPageContext();
  let invoices: Awaited<ReturnType<typeof listCustomerInvoices>> | null = null;
  try {
    invoices = await listCustomerInvoices(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!invoices) return <AppShell title="Invoices" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Invoices" userName={userName}>
      <div className="mb-4 flex justify-end"><Link href="/finance/invoices/new"><Button>Create Invoice</Button></Link></div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Account</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Outstanding</TableHead><TableHead>Due</TableHead></TableRow></TableHeader><TableBody>
          {invoices.map((invoice) => <TableRow key={invoice.id}><TableCell><Link href={`/finance/invoices/${invoice.id}`} className="font-medium text-brand-700">{invoice.invoiceNumber}</Link></TableCell><TableCell>{invoice.account.name}</TableCell><TableCell><ModuleStatusBadge value={invoice.status} /></TableCell><TableCell>{formatModuleMoney(invoice.totalAmount, invoice.currency)}</TableCell><TableCell>{formatModuleMoney(invoice.outstandingAmount, invoice.currency)}</TableCell><TableCell>{formatModuleDate(invoice.dueDate)}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
