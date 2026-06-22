import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleUserApiError, parseJsonBody, requireUserAdmin } from "@/services/users/user-api-utils";
import { resetUserPassword } from "@/services/users/user-service";
import { userResetPasswordSchema } from "@/services/users/user-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await requireUserAdmin();
    const { id } = await params;
    const input = await parseJsonBody(request, userResetPasswordSchema);
    return NextResponse.json(successResponse(await resetUserPassword(admin.id, id, input)));
  } catch (error) {
    return handleUserApiError(error);
  }
}
