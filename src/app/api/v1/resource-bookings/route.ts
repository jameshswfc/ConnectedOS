import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { resourceBookingCreateSchema } from "@/modules/field-services/field-services-schemas";
import { createResourceBooking, listResourceBookings } from "@/modules/field-services/field-services-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(successResponse(await listResourceBookings(await getModuleContext(), {
      resourceId: params.get("resourceId") || undefined,
      bookingType: params.get("bookingType") || undefined,
      status: params.get("status") || undefined
    })));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  let requestBody: unknown = null;
  try {
    const context = await getModuleContext();
    requestBody = await request.json();
    const payload = resourceBookingCreateSchema.parse(requestBody);
    return NextResponse.json(successResponse(await createResourceBooking(context, payload)), { status: 201 });
  } catch (error) {
    const context = await getModuleContext().catch(() => null);
    return handleModuleApiError(error, {
      module: "field_services",
      action: "create_resource_booking",
      userId: context?.userId,
      payloadSummary: requestBody && typeof requestBody === "object"
        ? {
            resourceId: (requestBody as { resourceId?: string }).resourceId ?? null,
            helpdeskTicketId: (requestBody as { helpdeskTicketId?: string }).helpdeskTicketId ?? null,
            accountId: (requestBody as { accountId?: string }).accountId ?? null,
            projectId: (requestBody as { projectId?: string }).projectId ?? null,
            bookingType: (requestBody as { bookingType?: string }).bookingType ?? null
          }
        : null
    });
  }
}
