import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { completeActivity } from "@/modules/crm/activities/activity-service";
import { getCrmContext, handleApiError } from "@/modules/crm/api/crm-api-utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id } = await params;
    return NextResponse.json(successResponse(await completeActivity(await getCrmContext(), id, body.outcome)));
  } catch (error) {
    return handleApiError(error);
  }
}
