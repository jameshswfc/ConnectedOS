import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { MarkAllNotificationsReadButton, MarkNotificationReadButton } from "@/components/notifications/notification-actions";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { listNotificationsForUser } from "@/services/notifications/notification-service";

type PageProps = { searchParams?: Promise<{ status?: string; type?: string }> };

export default async function NotificationsPage({ searchParams }: PageProps) {
  const user = await requireAuthenticatedUser();
  const resolvedSearchParams = await searchParams;
  const allNotifications = await listNotificationsForUser(user.id);
  const notifications = allNotifications.filter((notification) => {
    const metadata = notification.metadata as { type?: string } | null;
    const statusMatches = !resolvedSearchParams?.status || notification.status === resolvedSearchParams.status;
    const typeMatches = !resolvedSearchParams?.type || metadata?.type === resolvedSearchParams.type;
    return statusMatches && typeMatches;
  });

  return (
    <AppShell title="Notifications" userName={user.name}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link href="/notifications?status=unread" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">Unread</Link>
          <Link href="/notifications?status=read" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">Read</Link>
          <Link href="/notifications" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">All</Link>
        </div>
        <MarkAllNotificationsReadButton />
      </div>
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-slate-600">No notifications yet.</CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id}>
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">{notification.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                    {notificationLink(notification.metadata) ? <Link href={notificationLink(notification.metadata) ?? "#"} className="mt-2 inline-block text-sm font-medium text-brand-700">Open linked record</Link> : null}
                  </div>
                  <div className="space-y-2 text-right">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{notification.status}</span>
                    {notification.status === "unread" ? <MarkNotificationReadButton notificationId={notification.id} /> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}

function notificationLink(metadata: unknown) {
  const parsed = metadata as { link?: string; href?: string } | null | undefined;
  return parsed?.link ?? parsed?.href;
}
