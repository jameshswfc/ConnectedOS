import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateNotificationInput = {
  userId: string;
  title: string;
  body: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      metadata: input.metadata
    }
  });
}

export async function listNotificationsForUser(userId: string) {
  return prisma.notification.findMany({
    where: {
      userId,
      status: {
        not: "archived"
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function countUnreadNotificationsForUser(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      status: "unread"
    }
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  return prisma.notification.update({
    where: {
      id: notificationId,
      userId
    },
    data: {
      status: "read",
      readAt: new Date()
    }
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      status: "unread"
    },
    data: {
      status: "read",
      readAt: new Date()
    }
  });
}
