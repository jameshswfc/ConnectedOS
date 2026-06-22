import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAccounts } from "@/modules/crm/accounts/account-service";
import { formatMoney, labelFromValue } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { searchParams?: Promise<{ search?: string }> };

export default async function AccountsPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const accounts = await listAccounts(context, resolvedSearchParams?.search);

  return (
    <AppShell title="Accounts" userName={userName}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form className="flex gap-2">
          <input name="search" defaultValue={resolvedSearchParams?.search} placeholder="Search accounts" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <Link href="/crm/accounts/new"><Button>Create Account</Button></Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead>Opportunities</TableHead><TableHead>Pipeline</TableHead></TableRow></TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell><Link href={`/crm/accounts/${account.id}`} className="font-medium text-brand-700">{account.name}</Link></TableCell>
                <TableCell>{labelFromValue(account.accountType)}</TableCell>
                <TableCell>{labelFromValue(account.status)}</TableCell>
                <TableCell>{account.owner.displayName}</TableCell>
                <TableCell>{account._count.opportunities}</TableCell>
                <TableCell>{formatMoney(0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
