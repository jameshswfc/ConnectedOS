import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { helpdeskQueueSchema } from "@/modules/helpdesk/helpdesk-schemas";
import { createHelpdeskQueue, listHelpdeskQueues } from "@/modules/helpdesk/helpdesk-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listHelpdeskQueues(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createHelpdeskQueue(await getModuleContext(), helpdeskQueueSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
