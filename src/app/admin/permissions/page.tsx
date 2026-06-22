import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { userHasPermission } from "@/services/permissions/permission-service";
import { listPermissions } from "@/services/users/user-service";

export default async function PermissionsPage() {
  const user = await requireAuthenticatedUser();
  if (!await userHasPermission(user.id, "admin.roles")) {
    return (
      <AppShell title="Permissions" userName={user.name}>
        <AccessDenied />
      </AppShell>
    );
  }
  const permissions = await listPermissions();

  return (
    <AppShell title="Permissions" userName={user.name}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell className="font-mono text-xs">{permission.code}</TableCell>
                <TableCell>{permission.module}</TableCell>
                <TableCell>{permission.action}</TableCell>
                <TableCell>{permission.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
