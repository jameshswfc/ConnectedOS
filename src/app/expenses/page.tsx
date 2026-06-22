import Link from "next/link";
import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { listExpenseClaims } from "@/modules/expenses/expense-service";
import { ModuleMetricCard, ModuleStatusBadge, formatModuleDate, formatModuleMoney } from "@/modules/operations/ui/module-ui";

export default async function ExpensesPage() {
  const { context, userName } = await getCrmPageContext();
  let claims: Awaited<ReturnType<typeof listExpenseClaims>> | null = null;
  try {
    claims = await listExpenseClaims(context);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Missing permission")) throw error;
  }
  if (!claims) return <AppShell title="Expenses" userName={userName}><AccessDenied /></AppShell>;
  return (
    <AppShell title="Expenses" userName={userName}>
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Link href="/expenses/new"><Button>New Claim</Button></Link>
          <Link href="/expenses/approvals"><Button variant="secondary">Approvals</Button></Link>
          <Link href="/expenses/payment-runs"><Button variant="secondary">Payment Runs</Button></Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <ModuleMetricCard title="Claims" value={claims.length} />
        <ModuleMetricCard title="Submitted" value={claims.filter((claim) => claim.status === "submitted").length} />
        <ModuleMetricCard title="Approved" value={claims.filter((claim) => claim.status === "approved").length} />
        <ModuleMetricCard title="Total value" value={formatModuleMoney(claims.reduce((sum, claim) => sum + Number(claim.totalAmount), 0))} />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table><TableHeader><TableRow><TableHead>Claim</TableHead><TableHead>User</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader><TableBody>
          {claims.map((claim) => <TableRow key={claim.id}><TableCell><Link href={`/expenses/${claim.id}`} className="font-medium text-brand-700">{claim.claimNumber}</Link></TableCell><TableCell>{claim.user.displayName}</TableCell><TableCell>{claim.project?.name ?? "-"}</TableCell><TableCell><ModuleStatusBadge value={claim.status} /></TableCell><TableCell>{formatModuleMoney(claim.totalAmount, claim.currency)}</TableCell><TableCell>{formatModuleDate(claim.submittedAt)}</TableCell></TableRow>)}
        </TableBody></Table>
      </div>
    </AppShell>
  );
}
