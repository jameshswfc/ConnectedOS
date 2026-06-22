import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { leadUpdateSchema } from "@/modules/crm/schemas/crm-schemas";
import { getLead, softDeleteLead, updateLead } from "@/modules/crm/leads/lead-service";
import { getCrmContext, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getLead(await getCrmContext(), id)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateLead(await getCrmContext(), id, await parseJsonBody(request, leadUpdateSchema))));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeleteLead(await getCrmContext(), id)));
  } catch (error) {
    return handleApiError(error);
  }
}
