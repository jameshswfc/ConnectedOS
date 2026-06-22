import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { userHasPermission } from "@/services/permissions/permission-service";
import { approvedRoleAccess, listRoles } from "@/services/users/user-service";

export default async function RolesPage() {
  const user = await requireAuthenticatedUser();
  if (!await userHasPermission(user.id, "admin.roles")) {
    return (
      <AppShell title="Roles" userName={user.name}>
        <AccessDenied />
      </AppShell>
    );
  }
  const roles = await listRoles();

  return (
    <AppShell title="Roles" userName={user.name}>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Approved Role Catalogue</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          These are the roles available for normal user assignment. Assign roles from <span className="font-medium text-slate-900">Admin / Users</span>. Older internal roles may remain in the database for compatibility, but they are hidden from normal administration.
        </CardContent>
      </Card>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Permissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>{role.name}</TableCell>
                <TableCell>{approvedRoleAccess[role.name as keyof typeof approvedRoleAccess] ?? role.description}</TableCell>
                <TableCell>{role._count.users}</TableCell>
                <TableCell>{role._count.rolePermissions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
