import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, getProjectFilters, handleProjectApiError } from "@/modules/projects/api/project-api-utils";
import { getProjectsDashboard } from "@/modules/projects/project-service";

export async function GET(request: Request) {
  try {
    return NextResponse.json(successResponse(await getProjectsDashboard(await getProjectContext(), getProjectFilters(request))));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
