import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { accountCreateSchema } from "@/modules/crm/schemas/crm-schemas";
import { createAccount, listAccounts } from "@/modules/crm/accounts/account-service";
import { getCrmContext, getSearchParam, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

export async function GET(request: Request) {
  try {
    const context = await getCrmContext();
    const accounts = await listAccounts(context, getSearchParam(request));
    return NextResponse.json(successResponse(accounts));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCrmContext();
    const input = await parseJsonBody(request, accountCreateSchema);
    const account = await createAccount(context, input);
    return NextResponse.json(successResponse(account), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
