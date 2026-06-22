import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { opportunityUpdateSchema } from "@/modules/crm/schemas/crm-schemas";
import { getOpportunity, softDeleteOpportunity, updateOpportunity } from "@/modules/crm/opportunities/opportunity-service";
import { getCrmContext, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getOpportunity(await getCrmContext(), id)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateOpportunity(await getCrmContext(), id, await parseJsonBody(request, opportunityUpdateSchema))));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeleteOpportunity(await getCrmContext(), id)));
  } catch (error) {
    return handleApiError(error);
  }
}
