import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { resourceBookingUpdateSchema } from "@/modules/field-services/field-services-schemas";
import { getResourceBooking, updateResourceBooking } from "@/modules/field-services/field-services-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getResourceBooking(await getModuleContext(), id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateResourceBooking(await getModuleContext(), id, resourceBookingUpdateSchema.parse(await request.json()))));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
