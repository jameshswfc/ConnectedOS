import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleUserApiError, requireUserAdmin } from "@/services/users/user-api-utils";
import { archiveUser } from "@/services/users/user-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUserAdmin();
    return NextResponse.json(successResponse(await archiveUser(admin.id, (await params).id)));
  } catch (error) { return handleUserApiError(error); }
}
