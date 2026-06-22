import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { createProjectFinancialEntry, getProject } from "@/modules/projects/project-service";
import { projectFinancialEntrySchema } from "@/modules/projects/project-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse((await getProject(await getProjectContext(), id)).financialEntries));
  } catch (error) {
    return handleProjectApiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await createProjectFinancialEntry(await getProjectContext(), id, await parseJsonBody(request, projectFinancialEntrySchema))), { status: 201 });
  } catch (error) {
    return handleProjectApiError(error);
  }
}
