import { getProjectContext, handleProjectApiError } from "@/modules/projects/api/project-api-utils";
import { fileResponse } from "@/modules/projects/api/project-route-responses";
import { exportIssuesActionsExcel } from "@/modules/projects/project-export-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return fileResponse(await exportIssuesActionsExcel(await getProjectContext(), id));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
