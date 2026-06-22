import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { checkProjectResourceConflicts } from "@/modules/projects/project-service";
import { projectResourceConflictCheckSchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await checkProjectResourceConflicts(await getProjectContext(), id, await parseJsonBody(request, projectResourceConflictCheckSchema))));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
