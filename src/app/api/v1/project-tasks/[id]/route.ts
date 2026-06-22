import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { softDeleteProjectTask, updateProjectTask } from "@/modules/projects/project-service";
import { projectTaskUpdateSchema, type ProjectTaskUpdateInput } from "@/modules/projects/project-schemas";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  let submittedPayload: ProjectTaskUpdateInput | null = null;
  let context: Awaited<ReturnType<typeof getProjectContext>> | null = null;
  let taskId: string | null = null;
  try {
    ({ id: taskId } = await params);
    context = await getProjectContext();
    submittedPayload = await parseJsonBody(request, projectTaskUpdateSchema);
    return NextResponse.json(successResponse(await updateProjectTask(context, taskId, submittedPayload)));
  } catch (error) {
    const projectId = taskId
      ? (await prisma.projectTask.findUnique({ where: { id: taskId }, select: { projectId: true } }).catch(() => null))?.projectId ?? null
      : null;
    console.error("Project task update route failed", {
      projectId,
      taskId,
      userId: context?.userId ?? null,
      submittedPayload: serialiseTaskPayload(submittedPayload),
      exceptionMessage: error instanceof Error ? error.message : String(error)
    });
    return handleProjectApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeleteProjectTask(await getProjectContext(), id)));
  } catch (error) {
    return handleProjectApiError(error);
  }
}

function serialiseTaskPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const value = payload as Record<string, unknown>;
  return {
    ...value,
    startDate: value.startDate instanceof Date ? value.startDate.toISOString() : value.startDate,
    endDate: value.endDate instanceof Date ? value.endDate.toISOString() : value.endDate
  };
}
