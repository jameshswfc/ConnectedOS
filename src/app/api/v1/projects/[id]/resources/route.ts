import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { createProjectResource, getProject } from "@/modules/projects/project-service";
import { projectResourceCreateSchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse((await getProject(await getProjectContext(), id)).resourceAssignments));
  } catch (error) {
    return handleProjectApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await createProjectResource(await getProjectContext(), id, await parseJsonBody(request, projectResourceCreateSchema))), { status: 201 });
  } catch (error) {
    return handleProjectApiError(error);
  }
}
