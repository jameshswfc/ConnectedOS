import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { purchaseOrderCreateSchema } from "@/modules/procurement/procurement-schemas";
import { createPurchaseOrder, listPurchaseOrders } from "@/modules/procurement/procurement-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listPurchaseOrders(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getModuleContext();
    const payload = await request.json();
    const normalizedPayload = {
      ...payload,
      lines: Array.isArray(payload?.lines)
        ? payload.lines
        : typeof payload?.linesJson === "string" && payload.linesJson.trim().length > 0
          ? JSON.parse(payload.linesJson)
          : []
    };
    return NextResponse.json(successResponse(await createPurchaseOrder(context, purchaseOrderCreateSchema.parse(normalizedPayload))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error, { module: "procurement", action: "create_purchase_order" });
  }
}
