import { ExpenseCategory } from "@prisma/client";
import { AuditPanel } from "@/components/audit/audit-panel";
import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionButton } from "@/components/forms/json-action-form";
import { MultipartActionForm } from "@/components/forms/multipart-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getExpenseClaim } from "@/modules/expenses/expense-service";
import { ModuleDetailGrid, ModuleStatusBadge, formatModuleDate, formatModuleLabel, formatModuleMoney } from "@/modules/operations/ui/module-ui";

type Params = { params: Promise<{ id: string }> };
export default async function ExpenseClaimDetailPage({ params }: Params) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  let claim: Awaited<ReturnType<typeof getExpenseClaim>> | null = null;
  try {
    claim = await getExpenseClaim(context, id);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!claim) return <AppShell title="Expense Claim" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title={claim.claimNumber} userName={userName}>
      <Card>
        <CardHeader><CardTitle>Claim Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ModuleDetailGrid items={[
            { label: "Claimant", value: claim.user.displayName },
            { label: "Status", value: formatModuleLabel(claim.status) },
            { label: "Project", value: claim.project?.name ?? "-" },
            { label: "Booking", value: claim.resourceBooking?.title ?? "-" },
            { label: "Account", value: claim.account?.name ?? "-" },
            { label: "Total", value: formatModuleMoney(claim.totalAmount, claim.currency) }
          ]} />
          <div className="flex flex-wrap gap-2">
            <ModuleStatusBadge value={claim.status} />
            <JsonActionButton endpoint={`/api/v1/expense-claims/${claim.id}/submit`} method="POST" label="Submit" />
            <JsonActionButton endpoint={`/api/v1/expense-claims/${claim.id}/approve`} method="POST" label="Approve" />
            <JsonActionButton endpoint={`/api/v1/expense-claims/${claim.id}/query`} method="POST" label="Query" variant="secondary" />
            <JsonActionButton endpoint={`/api/v1/expense-claims/${claim.id}/reject`} method="POST" label="Reject" variant="secondary" />
            <JsonActionButton endpoint={`/api/v1/expense-claims/${claim.id}/pay`} method="POST" label="Mark Paid" variant="secondary" />
            <a href={`/api/v1/expense-claims/${claim.id}/receipt-pack/pdf`} className="inline-flex h-10 items-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white">Export Receipts PDF</a>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Add Expense Line</CardTitle></CardHeader>
        <CardContent>
          <MultipartActionForm
            endpoint={`/api/v1/expense-claims/${claim.id}/lines`}
            buttonLabel="Add Expense Line"
            fields={[
              { name: "expenseDate", label: "Expense date", type: "date", required: true },
              { name: "category", label: "Category", type: "select", required: true, options: Object.values(ExpenseCategory).map((value) => ({ id: value, label: value.replaceAll("_", " ") })) },
              { name: "description", label: "Description", required: true },
              { name: "amount", label: "Amount", type: "number" },
              { name: "vatAmount", label: "VAT", type: "number" },
              { name: "currency", label: "Currency", defaultValue: claim.currency },
              { name: "mileageMiles", label: "Mileage miles", type: "number" },
              { name: "mileageRate", label: "Mileage rate", type: "number", defaultValue: "0.45" },
              { name: "mileageFrom", label: "Mileage from" },
              { name: "mileageTo", label: "Mileage to" },
              { name: "file", label: "Receipt", accept: ".pdf,.png,.jpg,.jpeg,.csv,.txt,.docx,.xlsx,.pptx" }
            ]}
          />
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader><CardTitle>Expense Lines</CardTitle></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Receipt</TableHead></TableRow></TableHeader><TableBody>
            {claim.lines.map((line) => <TableRow key={line.id}><TableCell>{formatModuleDate(line.expenseDate)}</TableCell><TableCell>{formatModuleLabel(line.category)}</TableCell><TableCell>{line.description}</TableCell><TableCell>{formatModuleMoney(Number(line.amount) + Number(line.vatAmount ?? 0), line.currency)}</TableCell><TableCell>{line.receiptDocument?.fileName ?? "-"}</TableCell></TableRow>)}
          </TableBody></Table>
        </CardContent>
      </Card>
      <AuditPanel module="expenses" entityType="ExpenseClaim" entityId={claim.id} />
    </AppShell>
  );
}
