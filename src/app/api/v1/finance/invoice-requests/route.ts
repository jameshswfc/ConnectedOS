import { NextResponse } from "next/server";
import { getModuleContext } from "@/modules/operations/api-utils";
import { requestProjectInvoice } from "@/modules/finance/invoice-request-service";
import { successResponse } from "@/lib/api-response";
import { sageApiError, verifySageOrigin } from "@/services/integrations/sage/sage-api";

export async function POST(request: Request) {
  try {
    const context = await getModuleContext();
    verifySageOrigin(request);
    const result = await requestProjectInvoice(context, await request.json());
    return NextResponse.json(successResponse({ id: result.id, status: result.status }), { status: 201 });
  } catch (error) { return sageApiError(error); }
}
