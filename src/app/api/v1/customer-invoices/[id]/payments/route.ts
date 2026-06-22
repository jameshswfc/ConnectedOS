import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { paymentCreateSchema } from "@/modules/finance/finance-schemas";
import { recordCustomerPayment } from "@/modules/finance/finance-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await recordCustomerPayment(await getModuleContext(), id, paymentCreateSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
