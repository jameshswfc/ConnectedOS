import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getCrmContext, handleApiError, parseJsonBody } from "@/modules/crm/api/crm-api-utils";
import { changeOpportunityStage } from "@/modules/crm/opportunities/opportunity-service";
import { opportunityStageChangeSchema } from "@/modules/crm/schemas/crm-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, opportunityStageChangeSchema);
    return NextResponse.json(successResponse(await changeOpportunityStage(await getCrmContext(), id, body)));
  } catch (error) {
    return handleApiError(error);
  }
}
