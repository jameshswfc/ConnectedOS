import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { billingScheduleCreateSchema } from "@/modules/finance/finance-schemas";
import { createBillingSchedule, listBillingSchedules } from "@/modules/finance/finance-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listBillingSchedules(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createBillingSchedule(await getModuleContext(), billingScheduleCreateSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
