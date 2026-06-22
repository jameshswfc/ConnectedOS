import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { salesActivityUpdateSchema } from "@/modules/crm/schemas/crm-schemas";
import { updateActivity } from "@/modules/crm/activities/activity-service";
import { getCrmContext, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateActivity(await getCrmContext(), id, await parseJsonBody(request, salesActivityUpdateSchema))));
  } catch (error) {
    return handleApiError(error);
  }
}
