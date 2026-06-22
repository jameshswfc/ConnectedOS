import { NextResponse } from "next/server";
import { z } from "zod";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { rejectProjectChangeRequest } from "@/modules/projects/project-service";

type Params = { params: Promise<{ id: string }> };

const rejectSchema = z.object({
  reason: z.string().optional()
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, rejectSchema);
    return NextResponse.json(successResponse(await rejectProjectChangeRequest(await getProjectContext(), id, body.reason)));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
