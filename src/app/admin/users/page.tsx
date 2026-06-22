import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { userHasPermission } from "@/services/permissions/permission-service";
import { listBusinessRoles, listUsers } from "@/services/users/user-service";
import { AdminUserManagement } from "@/services/users/ui/admin-user-management";

export default async function UsersPage() {
  const user = await requireAuthenticatedUser();
  if (!await userHasPermission(user.id, "admin.users")) {
    return (
      <AppShell title="Users" userName={user.name}>
        <AccessDenied />
      </AppShell>
    );
  }
  const [users, roles] = await Promise.all([listUsers(true), listBusinessRoles()]);

  return (
    <AppShell title="Users" userName={user.name}>
      <AdminUserManagement
        users={users.map((row) => ({ ...row, lastLoginAt: row.lastLoginAt?.toISOString() ?? null }))}
        roles={roles}
      />
    </AppShell>
  );
}
