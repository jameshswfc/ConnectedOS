import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getPresalesContext, handlePresalesApiError, parseJsonBody } from "@/modules/presales/api/presales-api-utils";
import { updatePresalesTask } from "@/modules/presales/presales-service";
import { presalesTaskUpdateSchema } from "@/modules/presales/schemas/presales-schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updatePresalesTask(await getPresalesContext(), id, await parseJsonBody(request, presalesTaskUpdateSchema))));
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

