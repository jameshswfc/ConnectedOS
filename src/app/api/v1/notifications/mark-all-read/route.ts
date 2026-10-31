import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { requireAuthenticatedApiUser } from "@/services/auth/auth-service";
import { handleModuleApiError } from "@/modules/operations/api-utils";
import { markAllNotificationsRead } from "@/services/notifications/notification-service";

export async function POST() {
  try {
    const user = await requireAuthenticatedApiUser();
    return NextResponse.json(successResponse(await markAllNotificationsRead(user.id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
