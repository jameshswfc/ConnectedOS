import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { markAllNotificationsRead } from "@/services/notifications/notification-service";

export async function POST() {
  const user = await requireAuthenticatedUser();
  return NextResponse.json(successResponse(await markAllNotificationsRead(user.id)));
}
