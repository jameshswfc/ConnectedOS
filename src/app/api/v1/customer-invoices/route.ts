import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { customerInvoiceCreateSchema } from "@/modules/finance/finance-schemas";
import { createCustomerInvoice, listCustomerInvoices } from "@/modules/finance/finance-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listCustomerInvoices(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createCustomerInvoice(await getModuleContext(), customerInvoiceCreateSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
