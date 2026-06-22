import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getPresalesContext, handlePresalesApiError } from "@/modules/presales/api/presales-api-utils";
import { completePresalesTask } from "@/modules/presales/presales-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await completePresalesTask(await getPresalesContext(), id)));
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

