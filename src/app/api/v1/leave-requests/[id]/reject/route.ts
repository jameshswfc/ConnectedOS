import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { leaveRejectionSchema } from "@/modules/leave/leave-schemas";
import { rejectLeaveRequest } from "@/modules/leave/leave-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  let body: unknown = {};
  try {
    const { id } = await params;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const parsed = leaveRejectionSchema.parse(body);
    const context = await getModuleContext();
    return NextResponse.json(successResponse(await rejectLeaveRequest(context, id, parsed.rejectionReason)));
  } catch (error) {
    const { id } = await params;
    return handleModuleApiError(error, {
      module: "leave",
      action: "reject_leave",
      recordId: id,
      payloadSummary: body && typeof body === "object" ? { hasReason: Boolean((body as { rejectionReason?: string }).rejectionReason) } : { hasReason: false }
    });
  }
}
