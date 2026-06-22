import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { assetUpdateSchema } from "@/modules/assets/asset-schemas";
import { getAsset, updateAsset } from "@/modules/assets/asset-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getAsset(await getModuleContext(), id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateAsset(await getModuleContext(), id, assetUpdateSchema.parse(await request.json()))));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
