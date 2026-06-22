import { NextResponse } from "next/server";
import { PresalesDeliverableStatus } from "@prisma/client";
import { successResponse } from "@/lib/api-response";
import { getPresalesContext, handlePresalesApiError } from "@/modules/presales/api/presales-api-utils";
import { changePresalesDeliverableStatus } from "@/modules/presales/presales-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!isPresalesDeliverableStatus(body.status)) throw new Error("Invalid deliverable status");
    return NextResponse.json(successResponse(await changePresalesDeliverableStatus(await getPresalesContext(), id, body.status)));
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

function isPresalesDeliverableStatus(value: unknown): value is PresalesDeliverableStatus {
  return typeof value === "string" && Object.values(PresalesDeliverableStatus).includes(value as PresalesDeliverableStatus);
}
