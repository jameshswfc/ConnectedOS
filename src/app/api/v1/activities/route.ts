import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { salesActivityCreateSchema } from "@/modules/crm/schemas/crm-schemas";
import { createActivity, listActivities } from "@/modules/crm/activities/activity-service";
import { getCrmContext, getOptionalQueryParam, getSearchParam, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

export async function GET(request: Request) {
  try {
    return NextResponse.json(successResponse(await listActivities(await getCrmContext(), { search: getSearchParam(request), salespersonId: getOptionalQueryParam(request, "salespersonId") })));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createActivity(await getCrmContext(), await parseJsonBody(request, salesActivityCreateSchema))), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
