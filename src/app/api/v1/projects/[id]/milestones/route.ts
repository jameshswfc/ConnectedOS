import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { createProjectMilestone, getProject } from "@/modules/projects/project-service";
import { projectMilestoneCreateSchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse((await getProject(await getProjectContext(), id)).milestones));
  } catch (error) {
    return handleProjectApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await createProjectMilestone(await getProjectContext(), id, await parseJsonBody(request, projectMilestoneCreateSchema))), { status: 201 });
  } catch (error) {
    return handleProjectApiError(error);
  }
}
