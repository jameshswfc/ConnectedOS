import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getPresalesContext, handlePresalesApiError, parseJsonBody } from "@/modules/presales/api/presales-api-utils";
import { linkPresalesDocument } from "@/modules/presales/presales-service";
import { presalesDocumentCreateSchema } from "@/modules/presales/schemas/presales-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await linkPresalesDocument(await getPresalesContext(), id, await parseJsonBody(request, presalesDocumentCreateSchema))), { status: 201 });
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

