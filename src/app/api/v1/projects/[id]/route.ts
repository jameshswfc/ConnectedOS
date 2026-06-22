import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { getProject, softDeleteProject, updateProject } from "@/modules/projects/project-service";
import { projectUpdateSchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getProject(await getProjectContext(), id)));
  } catch (error) {
    return handleProjectApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateProject(await getProjectContext(), id, await parseJsonBody(request, projectUpdateSchema))));
  } catch (error) {
    return handleProjectApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeleteProject(await getProjectContext(), id)));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
