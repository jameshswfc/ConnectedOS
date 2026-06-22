import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { leaveRequestCreateSchema } from "@/modules/leave/leave-schemas";
import { createLeaveRequest, listLeaveRequests } from "@/modules/leave/leave-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listLeaveRequests(await getModuleContext())));
  } catch (error) {
    return handleModuleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createLeaveRequest(await getModuleContext(), leaveRequestCreateSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
