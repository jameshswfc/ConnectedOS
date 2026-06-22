import { ReactNode } from "react";
import Image from "next/image";
import { ProfileMenu } from "@/components/auth/profile-menu";
import { BrandedBackground } from "@/components/layout/branded-background";
import { Sidebar } from "@/components/navigation/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GlobalSearchForm } from "@/components/search/global-search-form";
import { brandAssets } from "@/lib/brand";
import { getCurrentSession } from "@/services/auth/auth-service";
import { countUnreadNotificationsForUser, listNotificationsForUser } from "@/services/notifications/notification-service";

type AppShellProps = {
  children: ReactNode;
  title: string;
  userName?: string | null;
};

export async function AppShell({ children, title, userName }: AppShellProps) {
  const session = await getCurrentSession();
  const displayName = userName ?? session?.user?.name ?? "Signed in";
  const permissions = session?.user?.permissions ?? [];
  const permissionLevel = session?.user?.permissionLevel;
  const roleName = session?.user?.role;
  const [unreadNotifications, notifications] = session?.user?.id
    ? await Promise.all([countUnreadNotificationsForUser(session.user.id), listNotificationsForUser(session.user.id)])
    : [0, []];

  return (
    <div className="min-h-screen bg-hospitality-background text-slate-950">
      <div className="flex">
        <Sidebar userPermissions={permissions} permissionLevel={permissionLevel} roleName={roleName} />
        <div className="relative min-h-screen flex-1 overflow-hidden">
          <BrandedBackground />
          <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/95 px-4 py-4 shadow-sm shadow-brand-900/5 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-brand-100 bg-white p-1.5 lg:hidden">
                  <Image src={brandAssets.logo} alt="Connected Hospitality" width={32} height={32} className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Connected Hospitality</p>
                  <h1 className="text-xl font-semibold text-brand-900">{title}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GlobalSearchForm />
                <NotificationBell unreadCount={unreadNotifications} notifications={notifications} />
                <ProfileMenu userName={displayName} />
              </div>
            </div>
          </header>
          <main className="relative z-10 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
