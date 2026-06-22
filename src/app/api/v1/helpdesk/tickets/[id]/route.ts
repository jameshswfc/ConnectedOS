import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { helpdeskTicketUpdateSchema } from "@/modules/helpdesk/helpdesk-schemas";
import { getHelpdeskTicket, updateHelpdeskTicket } from "@/modules/helpdesk/helpdesk-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getHelpdeskTicket(await getModuleContext(), id)));
  } catch (error) {
    const { id } = await params;
    return handleModuleApiError(error, { module: "helpdesk", action: "get_ticket", recordId: id });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  let body: unknown = {};
  try {
    const { id } = await params;
    body = await request.json();
    const context = await getModuleContext();
    return NextResponse.json(successResponse(await updateHelpdeskTicket(context, id, helpdeskTicketUpdateSchema.parse(body))));
  } catch (error) {
    const { id } = await params;
    const context = await getModuleContext().catch(() => null);
    return handleModuleApiError(error, {
      module: "helpdesk",
      action: "update_ticket",
      recordId: id,
      userId: context?.userId,
      payloadSummary: body && typeof body === "object"
        ? {
            status: (body as { status?: string }).status ?? null,
            hasResolutionNote: Boolean((body as { resolutionNote?: string }).resolutionNote?.trim())
          }
        : { status: null, hasResolutionNote: false }
    });
  }
}
