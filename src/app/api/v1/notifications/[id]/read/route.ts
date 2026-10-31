import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { requireAuthenticatedApiUser } from "@/services/auth/auth-service";
import { handleModuleApiError } from "@/modules/operations/api-utils";
import { markNotificationRead } from "@/services/notifications/notification-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireAuthenticatedApiUser();
    const { id } = await params;
    return NextResponse.json(successResponse(await markNotificationRead(id, user.id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
