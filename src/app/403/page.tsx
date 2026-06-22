import { AccessDenied } from "@/components/auth/access-denied";
import { AppShell } from "@/components/layout/app-shell";

export default function AccessDeniedPage() {
  return (
    <AppShell title="Access Denied">
      <AccessDenied />
    </AppShell>
  );
}
