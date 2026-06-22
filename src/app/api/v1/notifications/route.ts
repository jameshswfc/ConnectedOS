import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { createNotification, listNotificationsForUser } from "@/services/notifications/notification-service";

const createNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1)
});

export async function GET() {
  const user = await requireAuthenticatedUser();
  const notifications = await listNotificationsForUser(user.id);

  return NextResponse.json(successResponse(notifications));
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser();
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
}
