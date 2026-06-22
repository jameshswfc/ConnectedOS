import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { helpdeskCommentSchema } from "@/modules/helpdesk/helpdesk-schemas";
import { addHelpdeskComment } from "@/modules/helpdesk/helpdesk-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await addHelpdeskComment(await getModuleContext(), id, helpdeskCommentSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
