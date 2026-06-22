import { NextResponse } from "next/server";
import { ProjectFormType } from "@prisma/client";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { createProjectForm } from "@/modules/projects/project-service";
import { projectFormCreateSchema, type ProjectFormCreateInput } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  let attemptedPayload: Record<string, unknown> | null = null;
  let projectId = "";
  let context: Awaited<ReturnType<typeof getProjectContext>> | null = null;
  try {
    const { id } = await params;
    projectId = id;
    const input = await parseJsonBody(request, projectFormCreateSchema);
    attemptedPayload = input as Record<string, unknown>;
    context = await getProjectContext();
    const payload: ProjectFormCreateInput = { ...input, formType: ProjectFormType.change_request };
    return NextResponse.json(successResponse(await createProjectForm(context, id, payload)), { status: 201 });
  } catch (error) {
    console.error("Project change request creation failed", {
      projectId,
      userId: context?.userId ?? null,
      attemptedPayload,
      message: error instanceof Error ? error.message : String(error)
    });
    return handleProjectApiError(error);
  }
}
