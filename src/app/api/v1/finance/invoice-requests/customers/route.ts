import { NextResponse } from "next/server";
import { getModuleContext } from "@/modules/operations/api-utils";
import { getInvoiceCustomers } from "@/modules/finance/invoice-request-service";
import { successResponse } from "@/lib/api-response";
import { sageApiError } from "@/services/integrations/sage/sage-api";

export async function GET() {
  try { return NextResponse.json(successResponse(await getInvoiceCustomers(await getModuleContext())), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return sageApiError(error); }
}
