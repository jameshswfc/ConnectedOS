import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { resourceCreateSchema } from "@/modules/field-services/field-services-schemas";
import { createResource, listResources } from "@/modules/field-services/field-services-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listResources(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createResource(await getModuleContext(), resourceCreateSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
