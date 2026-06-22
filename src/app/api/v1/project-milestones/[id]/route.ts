import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { updateProjectMilestone } from "@/modules/projects/project-service";
import { projectMilestoneUpdateSchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateProjectMilestone(await getProjectContext(), id, await parseJsonBody(request, projectMilestoneUpdateSchema))));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
