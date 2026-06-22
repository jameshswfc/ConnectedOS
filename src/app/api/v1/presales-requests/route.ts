import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getPresalesContext, getPresalesFilters, handlePresalesApiError, parseJsonBody } from "@/modules/presales/api/presales-api-utils";
import { createPresalesRequest, listPresalesRequests } from "@/modules/presales/presales-service";
import { presalesRequestCreateSchema } from "@/modules/presales/schemas/presales-schemas";

export async function GET(request: Request) {
  try {
    return NextResponse.json(successResponse(await listPresalesRequests(await getPresalesContext(), getPresalesFilters(request))));
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createPresalesRequest(await getPresalesContext(), await parseJsonBody(request, presalesRequestCreateSchema))), { status: 201 });
  } catch (error) {
    return handlePresalesApiError(error);
  }
}

