import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getPresalesContext, handlePresalesApiError, parseJsonBody } from "@/modules/presales/api/presales-api-utils";
import { changePresalesStatus } from "@/modules/presales/presales-service";
import { presalesStatusChangeSchema } from "@/modules/presales/schemas/presales-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await changePresalesStatus(await getPresalesContext(), id, await parseJsonBody(request, presalesStatusChangeSchema))));
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

