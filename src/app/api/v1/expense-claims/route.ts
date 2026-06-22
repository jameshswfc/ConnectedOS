import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { expenseClaimCreateSchema } from "@/modules/expenses/expense-schemas";
import { createExpenseClaim, listExpenseClaims } from "@/modules/expenses/expense-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listExpenseClaims(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getModuleContext();
    const payload = expenseClaimCreateSchema.parse(await request.json());
    return NextResponse.json(successResponse(await createExpenseClaim(context, payload)), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error, { module: "expenses", action: "create_expense_claim" });
  }
}
