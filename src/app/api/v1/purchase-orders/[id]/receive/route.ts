import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { recordGoodsReceipt } from "@/modules/procurement/procurement-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Params) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id } = await params;
    return NextResponse.json(successResponse(await recordGoodsReceipt(await getModuleContext(), id, body?.notes)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
