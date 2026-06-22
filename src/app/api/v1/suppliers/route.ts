import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { supplierCreateSchema } from "@/modules/procurement/procurement-schemas";
import { createSupplier, listSuppliers } from "@/modules/procurement/procurement-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listSuppliers(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createSupplier(await getModuleContext(), supplierCreateSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
