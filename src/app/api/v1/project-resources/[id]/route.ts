import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { softDeleteProjectResource, updateProjectResource } from "@/modules/projects/project-service";
import { projectResourceUpdateSchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateProjectResource(await getProjectContext(), id, await parseJsonBody(request, projectResourceUpdateSchema))));
  } catch (error) {
    return handleProjectApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeleteProjectResource(await getProjectContext(), id)));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
