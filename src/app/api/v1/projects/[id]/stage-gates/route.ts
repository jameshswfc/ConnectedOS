import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError } from "@/modules/projects/api/project-api-utils";
import { getProject } from "@/modules/projects/project-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse((await getProject(await getProjectContext(), id)).stageGates));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
