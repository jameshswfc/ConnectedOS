import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { createProjectTaskDependency } from "@/modules/projects/project-service";
import { projectDependencyCreateSchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await createProjectTaskDependency(await getProjectContext(), id, await parseJsonBody(request, projectDependencyCreateSchema))), { status: 201 });
  } catch (error) {
    return handleProjectApiError(error);
  }
}
