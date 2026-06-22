import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { helpdeskTicketCreateSchema } from "@/modules/helpdesk/helpdesk-schemas";
import { createHelpdeskTicket, listHelpdeskTickets } from "@/modules/helpdesk/helpdesk-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listHelpdeskTickets(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getModuleContext();
    const payload = helpdeskTicketCreateSchema.parse(await request.json());
    return NextResponse.json(successResponse(await createHelpdeskTicket(context, payload)), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error, { module: "helpdesk", action: "create_ticket" });
  }
}
