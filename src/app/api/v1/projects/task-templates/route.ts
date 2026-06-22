import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError, parseJsonBody } from "@/modules/projects/api/project-api-utils";
import { createProjectTaskTemplate, listProjectTaskTemplates } from "@/modules/projects/project-service";
import { projectTaskTemplateSchema } from "@/modules/projects/project-schemas";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listProjectTaskTemplates(await getProjectContext())));
  } catch (error) {
    return handleProjectApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createProjectTaskTemplate(await getProjectContext(), await parseJsonBody(request, projectTaskTemplateSchema))), { status: 201 });
  } catch (error) {
    return handleProjectApiError(error);
  }
}
