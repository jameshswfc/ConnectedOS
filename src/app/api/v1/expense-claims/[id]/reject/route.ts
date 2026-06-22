import { NextResponse } from "next/server";
import { ExpenseClaimStatus } from "@prisma/client";
import { successResponse } from "@/lib/api-response";
import { updateExpenseStatus } from "@/modules/expenses/expense-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(successResponse(await updateExpenseStatus(await getModuleContext(), id, ExpenseClaimStatus.rejected, undefined, body?.rejectionReason)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
