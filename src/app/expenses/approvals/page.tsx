import { AccessDenied } from "@/components/auth/access-denied";
import { JsonActionButton } from "@/components/forms/json-action-form";
import { AppShell } from "@/components/layout/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listExpenseClaims } from "@/modules/expenses/expense-service";
import { ModuleStatusBadge, formatModuleMoney } from "@/modules/operations/ui/module-ui";

export default async function ExpenseApprovalsPage() {
  const { context, userName } = await getCrmPageContext();
  let claims: Awaited<ReturnType<typeof listExpenseClaims>> | null = null;
  try {
    claims = await listExpenseClaims(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!claims) return <AppShell title="Expense Approvals" userName={userName}><AccessDenied /></AppShell>;
  const pending = claims.filter((claim) => claim.status === "submitted" || claim.status === "queried");
  return (
    <AppShell title="Expense Approvals" userName={userName}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Claim</TableHead><TableHead>User</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
          {pending.map((claim) => <TableRow key={claim.id}><TableCell>{claim.claimNumber}</TableCell><TableCell>{claim.user.displayName}</TableCell><TableCell><ModuleStatusBadge value={claim.status} /></TableCell><TableCell>{formatModuleMoney(claim.totalAmount, claim.currency)}</TableCell><TableCell><div className="flex gap-2"><JsonActionButton endpoint={`/api/v1/expense-claims/${claim.id}/approve`} method="POST" label="Approve" /><JsonActionButton endpoint={`/api/v1/expense-claims/${claim.id}/reject`} method="POST" label="Reject" variant="secondary" /></div></TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
