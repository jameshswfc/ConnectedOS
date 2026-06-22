import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { handleUserApiError, parseJsonBody } from "@/services/users/user-api-utils";
import { changeMyPassword } from "@/services/users/user-service";
import { changePasswordSchema } from "@/services/users/user-schemas";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser({ allowPasswordChangeRequired: true });
    return NextResponse.json(successResponse(await changeMyPassword(user.id, await parseJsonBody(request, changePasswordSchema))));
  } catch (error) {
    return handleUserApiError(error);
  }
}
