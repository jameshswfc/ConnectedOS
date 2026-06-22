import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleUserApiError, requireUserAdmin } from "@/services/users/user-api-utils";
import { deactivateUser } from "@/services/users/user-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const admin = await requireUserAdmin();
    const { id } = await params;
    return NextResponse.json(successResponse(await deactivateUser(admin.id, id)));
  } catch (error) {
    return handleUserApiError(error);
  }
}
