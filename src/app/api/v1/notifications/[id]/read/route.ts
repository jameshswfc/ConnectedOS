import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { markNotificationRead } from "@/services/notifications/notification-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;
  return NextResponse.json(successResponse(await markNotificationRead(id, user.id)));
}
