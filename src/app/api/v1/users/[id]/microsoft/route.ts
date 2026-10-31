import { NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { handleUserApiError, parseJsonBody, requireUserAdmin } from "@/services/users/user-api-utils";
import { linkMicrosoftAccount, MicrosoftAccountLinkError, microsoftAccountLinkSchema } from "@/services/auth/microsoft-account-link-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUserAdmin();
    const { id } = await params;
    const input = await parseJsonBody(request, microsoftAccountLinkSchema);
    return NextResponse.json(successResponse(await linkMicrosoftAccount(admin.id, id, input.objectId)));
  } catch (error) {
    if (error instanceof MicrosoftAccountLinkError) return NextResponse.json(errorResponse("VALIDATION_ERROR", error.message), { status: 400 });
    return handleUserApiError(error);
  }
}
