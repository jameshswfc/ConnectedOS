import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { accountUpdateSchema } from "@/modules/crm/schemas/crm-schemas";
import { getAccount, softDeleteAccount, updateAccount } from "@/modules/crm/accounts/account-service";
import { getCrmContext, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const context = await getCrmContext();
    const { id } = await params;
    return NextResponse.json(successResponse(await getAccount(context, id)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await getCrmContext();
    const input = await parseJsonBody(request, accountUpdateSchema);
    const { id } = await params;
    return NextResponse.json(successResponse(await updateAccount(context, id, input)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const context = await getCrmContext();
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeleteAccount(context, id)));
  } catch (error) {
    return handleApiError(error);
  }
}
