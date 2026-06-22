import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { createProjectIssueFromTicket } from "@/modules/helpdesk/helpdesk-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await createProjectIssueFromTicket(await getModuleContext(), id)), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error, { module: "helpdesk", action: "create_project_issue" });
  }
}
