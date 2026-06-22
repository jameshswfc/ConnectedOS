import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canAccessNavigationPath } from "@/components/navigation/navigation-items";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";

export async function FutureModulePage({ title, path }: { title: string; path: string }) {
  const user = await requireAuthenticatedUser();

  if (!canAccessNavigationPath(path, user.permissions, user.permissionLevel, user.role)) {
    return (
      <AppShell title={title} userName={user.name}>
        <AccessDenied />
      </AppShell>
    );
  }

  return (
    <AppShell title={title} userName={user.name}>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-slate-600">
          This module is coming in a future sprint.
        </CardContent>
      </Card>
    </AppShell>
  );
}
