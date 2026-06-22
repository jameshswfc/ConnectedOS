import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { getMe } from "@/services/users/user-service";
import { AccountSettingsForms } from "@/services/users/ui/account-settings-forms";

export default async function ChangePasswordPage() {
  const user = await requireAuthenticatedUser({ allowPasswordChangeRequired: true });
  const profile = await getMe(user.id);

  return (
    <AppShell title="Change Password" userName={user.name}>
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.mustChangePassword ? (
            <p className="rounded-md border border-gold-200 bg-gold-50 px-3 py-2 text-sm text-brand-900">You must change your password before continuing.</p>
          ) : null}
          <AccountSettingsForms user={{ displayName: profile.displayName, email: profile.email, role: profile.role, permissionLevel: profile.permissionLevel }} passwordOnly redirectAfterPasswordChange="/dashboard" />
        </CardContent>
      </Card>
    </AppShell>
  );
}
