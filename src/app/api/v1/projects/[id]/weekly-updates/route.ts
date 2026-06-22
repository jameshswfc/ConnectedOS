import { NextResponse } from "next/server";
import { ProjectFormType } from "@prisma/client";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { createProjectForm } from "@/modules/projects/project-service";
import { projectFormCreateSchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const input = await parseJsonBody(request, projectFormCreateSchema);
    return NextResponse.json(successResponse(await createProjectForm(await getProjectContext(), id, { ...input, formType: ProjectFormType.weekly_update })), { status: 201 });
  } catch (error) {
    return handleProjectApiError(error);
  }
}
