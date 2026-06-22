import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { assetCreateSchema } from "@/modules/assets/asset-schemas";
import { createAsset, listAssets } from "@/modules/assets/asset-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listAssets(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createAsset(await getModuleContext(), assetCreateSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
