import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { handleUserApiError, parseJsonBody } from "@/services/users/user-api-utils";
import { getMe, updateMe } from "@/services/users/user-service";
import { meUpdateSchema } from "@/services/users/user-schemas";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    return NextResponse.json(successResponse(await getMe(user.id)));
  } catch (error) {
    return handleUserApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    return NextResponse.json(successResponse(await updateMe(user.id, await parseJsonBody(request, meUpdateSchema))));
  } catch (error) {
    return handleUserApiError(error);
  }
}
