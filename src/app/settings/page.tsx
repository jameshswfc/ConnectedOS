import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { getMe } from "@/services/users/user-service";
import { AccountSettingsForms } from "@/services/users/ui/account-settings-forms";

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();
  const profile = await getMe(user.id);

  return (
    <AppShell title="Settings" userName={user.name}>
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountSettingsForms user={{ displayName: profile.displayName, email: profile.email, role: profile.role, permissionLevel: profile.permissionLevel }} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
