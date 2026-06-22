import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionButton } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listExpenseClaims } from "@/modules/expenses/expense-service";
import { ModuleStatusBadge, formatModuleMoney } from "@/modules/operations/ui/module-ui";

export default async function ExpensePaymentRunsPage() {
  const { context, userName } = await getCrmPageContext();
  let claims: Awaited<ReturnType<typeof listExpenseClaims>> | null = null;
  try {
    claims = await listExpenseClaims(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!claims) return <AppShell title="Expense Payment Runs" userName={userName}><AccessDenied /></AppShell>;
  const approved = claims.filter((claim) => claim.status === "approved");
  return (
    <AppShell title="Expense Payment Runs" userName={userName}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Claim</TableHead><TableHead>User</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead></TableRow></TableHeader><TableBody>
          {approved.map((claim) => <TableRow key={claim.id}><TableCell>{claim.claimNumber}</TableCell><TableCell>{claim.user.displayName}</TableCell><TableCell>{formatModuleMoney(claim.totalAmount, claim.currency)}</TableCell><TableCell><ModuleStatusBadge value={claim.status} /></TableCell><TableCell><JsonActionButton endpoint={`/api/v1/expense-claims/${claim.id}/pay`} method="POST" label="Mark Paid" /></TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
