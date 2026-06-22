import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { resourceUpdateSchema } from "@/modules/field-services/field-services-schemas";
import { getResource, removeResource, updateResource } from "@/modules/field-services/field-services-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getResource(await getModuleContext(), id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateResource(await getModuleContext(), id, resourceUpdateSchema.parse(await request.json()))));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await removeResource(await getModuleContext(), id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
