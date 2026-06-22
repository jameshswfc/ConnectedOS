"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MarkNotificationReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  async function markRead() {
    await fetch(`/api/v1/notifications/${notificationId}/read`, { method: "POST" });
    router.refresh();
  }
  return <Button type="button" variant="secondary" onClick={markRead}>Mark Read</Button>;
}

export function MarkAllNotificationsReadButton() {
  const router = useRouter();
  async function markAllRead() {
    await fetch("/api/v1/notifications/mark-all-read", { method: "POST" });
    router.refresh();
  }
  return <Button type="button" variant="secondary" onClick={markAllRead}>Mark All Read</Button>;
}
