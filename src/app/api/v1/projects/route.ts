import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, getProjectFilters, handleProjectApiError } from "@/modules/projects/api/project-api-utils";
import { createProjectFromQuote, listProjects } from "@/modules/projects/project-service";
import { projectCreateFromQuoteSchema } from "@/modules/projects/project-schemas";

export async function GET(request: Request) {
  try {
    return NextResponse.json(successResponse(await listProjects(await getProjectContext(), getProjectFilters(request))));
  } catch (error) {
    return handleProjectApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const quoteId = String(body.quoteId ?? "");
    return NextResponse.json(successResponse(await createProjectFromQuote(await getProjectContext(), quoteId, projectCreateFromQuoteSchema.parse(body))), { status: 201 });
  } catch (error) {
    return handleProjectApiError(error);
  }
}
