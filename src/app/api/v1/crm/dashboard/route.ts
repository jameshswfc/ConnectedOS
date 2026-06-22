import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getCrmDashboardStarter } from "@/modules/crm/dashboard/dashboard-service";
import { getCrmContext, getOptionalQueryParam, handleApiError } from "@/modules/crm/api/crm-api-utils";

export async function GET(request: Request) {
  try {
    return NextResponse.json(successResponse(await getCrmDashboardStarter(await getCrmContext(), getOptionalQueryParam(request, "salespersonId"))));
  } catch (error) {
    return handleApiError(error);
  }
}
