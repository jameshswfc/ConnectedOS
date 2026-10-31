import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAuthenticatedApiUser } from "@/services/auth/auth-service";
import { handleModuleApiError } from "@/modules/operations/api-utils";
import { createNotification, listNotificationsForUser } from "@/services/notifications/notification-service";

const createNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1)
});

export async function GET() {
  try {
    const user = await requireAuthenticatedApiUser();
    return NextResponse.json(successResponse(await listNotificationsForUser(user.id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedApiUser();
    const parsedBody = createNotificationSchema.safeParse(await request.json());

    if (!parsedBody.success) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", "Notification title and body are required."), {
        status: 400
      });
    }

    const notification = await createNotification({
      userId: user.id,
      title: parsedBody.data.title,
      body: parsedBody.data.body
    });

    return NextResponse.json(successResponse(notification), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
