import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { leadCreateSchema } from "@/modules/crm/schemas/crm-schemas";
import { createLead, listLeads } from "@/modules/crm/leads/lead-service";
import { getCrmContext, getOptionalQueryParam, getSearchParam, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

export async function GET(request: Request) {
  try {
    return NextResponse.json(successResponse(await listLeads(await getCrmContext(), { search: getSearchParam(request), salespersonId: getOptionalQueryParam(request, "salespersonId") })));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createLead(await getCrmContext(), await parseJsonBody(request, leadCreateSchema))), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
