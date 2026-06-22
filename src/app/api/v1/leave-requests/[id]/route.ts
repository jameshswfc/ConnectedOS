import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getLeaveRequest } from "@/modules/leave/leave-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getLeaveRequest(await getModuleContext(), id)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
