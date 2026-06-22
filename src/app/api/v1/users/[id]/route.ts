import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleUserApiError, parseJsonBody, requireUserAdmin } from "@/services/users/user-api-utils";
import { getUser, updateUser } from "@/services/users/user-service";
import { userUpdateSchema } from "@/services/users/user-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUserAdmin();
    const { id } = await params;
    return NextResponse.json(successResponse(await getUser(id)));
  } catch (error) {
    return handleUserApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireUserAdmin();
    const { id } = await params;
    const input = await parseJsonBody(request, userUpdateSchema);
    return NextResponse.json(successResponse(await updateUser(admin.id, id, input)));
  } catch (error) {
    return handleUserApiError(error);
  }
}
