import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { updateProjectIssueAction } from "@/modules/projects/project-service";
import { projectIssueActionUpdateSchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateProjectIssueAction(await getProjectContext(), id, await parseJsonBody(request, projectIssueActionUpdateSchema))));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
