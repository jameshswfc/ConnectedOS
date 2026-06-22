import { NextResponse } from "next/server";
import { ExpenseClaimStatus } from "@prisma/client";
import { successResponse } from "@/lib/api-response";
import { updateExpenseStatus } from "@/modules/expenses/expense-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateExpenseStatus(await getModuleContext(), id, ExpenseClaimStatus.queried)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
