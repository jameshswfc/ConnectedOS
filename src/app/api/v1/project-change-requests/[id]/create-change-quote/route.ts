import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getProjectContext, handleProjectApiError } from "@/modules/projects/api/project-api-utils";
import { createProjectChangeQuote } from "@/modules/projects/project-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await createProjectChangeQuote(await getProjectContext(), id)));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
