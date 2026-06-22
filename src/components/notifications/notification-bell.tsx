"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationPreview = {
  id: string;
  title: string;
  body: string;
  status: string;
  metadata?: unknown;
};

export function NotificationBell({ unreadCount, notifications }: { unreadCount: number; notifications: NotificationPreview[] }) {
  return (
    <details className="relative">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-brand-100 bg-white text-brand-900 shadow-sm hover:border-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{unreadCount}</span> : null}
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg shadow-brand-900/10">
        <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-2">
          <span className="font-semibold text-slate-900">Notifications</span>
          <Link href="/notifications" className="text-xs font-medium text-brand-700">View all</Link>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {notifications.length > 0 ? notifications.slice(0, 5).map((notification) => (
            <Link key={notification.id} href={notificationLink(notification) ?? "/notifications"} className="block rounded-md px-2 py-2 hover:bg-brand-50">
              <span className="block font-medium text-slate-900">{notification.title}</span>
              <span className="line-clamp-2 text-xs text-slate-600">{notification.body}</span>
            </Link>
          )) : <p className="px-2 py-3 text-sm text-slate-500">No notifications.</p>}
        </div>
      </div>
    </details>
  );
}

function notificationLink(notification: NotificationPreview) {
  const metadata = notification.metadata as { link?: string; href?: string } | null | undefined;
  return metadata?.link ?? metadata?.href;
}
