import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getPresalesContext, handlePresalesApiError, parseJsonBody } from "@/modules/presales/api/presales-api-utils";
import { getPresalesRequest, softDeletePresalesRequest, updatePresalesRequest } from "@/modules/presales/presales-service";
import { presalesRequestUpdateSchema } from "@/modules/presales/schemas/presales-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getPresalesRequest(await getPresalesContext(), id)));
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updatePresalesRequest(await getPresalesContext(), id, await parseJsonBody(request, presalesRequestUpdateSchema))));
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeletePresalesRequest(await getPresalesContext(), id)));
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

