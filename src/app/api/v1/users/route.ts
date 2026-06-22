import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleUserApiError, parseJsonBody, requireUserAdmin } from "@/services/users/user-api-utils";
import { createUser, listUsers } from "@/services/users/user-service";
import { userCreateSchema } from "@/services/users/user-schemas";

export async function GET() {
  try {
    await requireUserAdmin();
    return NextResponse.json(successResponse(await listUsers(true)));
  } catch (error) {
    return handleUserApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireUserAdmin();
    const input = await parseJsonBody(request, userCreateSchema);
    return NextResponse.json(successResponse(await createUser(admin.id, input)), { status: 201 });
  } catch (error) {
    return handleUserApiError(error);
  }
}
