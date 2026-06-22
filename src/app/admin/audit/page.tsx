import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { listAuditLogs, summarizeAuditValue } from "@/services/audit/audit-service";
import { userHasPermission } from "@/services/permissions/permission-service";
import { listUsers } from "@/services/users/user-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireAuthenticatedUser();
  const canReadAudit = user.permissionLevel === "administrator"
    || user.role === "Business Operations"
    || await userHasPermission(user.id, "audit.read");
  if (!canReadAudit) {
    redirect("/403");
  }

  const params = searchParams ? await searchParams : {};
  const getValue = (key: string) => {
    const raw = params[key];
    return typeof raw === "string" ? raw.trim() : "";
  };
  const [logs, users] = await Promise.all([
    listAuditLogs({
      module: getValue("module") || undefined,
      action: getValue("action") || undefined,
      entityType: getValue("entityType") || undefined,
      userId: getValue("userId") || undefined,
      search: getValue("search") || undefined,
      dateFrom: getValue("dateFrom") ? new Date(getValue("dateFrom")) : undefined,
      dateTo: getValue("dateTo") ? new Date(`${getValue("dateTo")}T23:59:59.999Z`) : undefined,
      take: 200
    }),
    listUsers(true)
  ]);

  return (
    <AppShell title="Audit" userName={user.name}>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Audit Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" action="/admin/audit">
            <label className="text-sm font-medium text-slate-700">Search
              <input name="search" defaultValue={getValue("search")} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium text-slate-700">Module
              <input name="module" defaultValue={getValue("module")} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium text-slate-700">Action
              <input name="action" defaultValue={getValue("action")} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium text-slate-700">Record Type
              <input name="entityType" defaultValue={getValue("entityType")} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium text-slate-700">User
              <select name="userId" defaultValue={getValue("userId")} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3">
                <option value="">All users</option>
                {users.map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-slate-700">From
                <input type="date" name="dateFrom" defaultValue={getValue("dateFrom")} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
              </label>
              <label className="text-sm font-medium text-slate-700">To
                <input type="date" name="dateTo" defaultValue={getValue("dateTo")} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" />
              </label>
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="inline-flex h-10 items-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white">Apply Filters</button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Record Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Before</TableHead>
              <TableHead>After</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.timestamp).toLocaleString("en-GB")}</TableCell>
                <TableCell>{log.user?.displayName ?? "System"}</TableCell>
                <TableCell>{log.module}</TableCell>
                <TableCell>{log.action.replaceAll("_", " ")}</TableCell>
                <TableCell>{log.entityType}</TableCell>
                <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                <TableCell className="text-xs text-slate-600">{summarizeAuditValue(log.previousValue) ?? "-"}</TableCell>
                <TableCell className="text-xs text-slate-600">{summarizeAuditValue(log.newValue) ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
