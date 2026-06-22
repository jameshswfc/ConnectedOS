import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getPurchaseOrder, updatePurchaseOrderStatus } from "@/modules/procurement/procurement-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getPurchaseOrder(await getModuleContext(), id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json(successResponse(await updatePurchaseOrderStatus(await getModuleContext(), id, body.status, body.notes)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
