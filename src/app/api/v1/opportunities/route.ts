import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { opportunityCreateSchema } from "@/modules/crm/schemas/crm-schemas";
import { createOpportunity, listOpportunities } from "@/modules/crm/opportunities/opportunity-service";
import { getCrmContext, getOptionalQueryParam, getSearchParam, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

export async function GET(request: Request) {
  try {
    return NextResponse.json(successResponse(await listOpportunities(await getCrmContext(), { search: getSearchParam(request), salespersonId: getOptionalQueryParam(request, "salespersonId") })));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createOpportunity(await getCrmContext(), await parseJsonBody(request, opportunityCreateSchema))), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
