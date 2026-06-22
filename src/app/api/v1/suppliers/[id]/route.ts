import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { supplierUpdateSchema } from "@/modules/procurement/procurement-schemas";
import { getSupplier, updateSupplier } from "@/modules/procurement/procurement-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getSupplier(await getModuleContext(), id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateSupplier(await getModuleContext(), id, supplierUpdateSchema.parse(await request.json()))));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
