import { NextResponse } from "next/server";
import { getModuleContext } from "@/modules/operations/api-utils";
import { syncSageInvoices } from "@/services/integrations/sage/sage-service";
import { sageApiError, verifySageOrigin } from "@/services/integrations/sage/sage-api";
import { successResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const context = await getModuleContext();
    verifySageOrigin(request);
    return NextResponse.json(successResponse(await syncSageInvoices(context)));
  } catch (error) { return sageApiError(error); }
}
