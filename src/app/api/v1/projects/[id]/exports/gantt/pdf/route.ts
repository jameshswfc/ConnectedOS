import { getProjectContext, handleProjectApiError } from "@/modules/projects/api/project-api-utils";
import { fileResponse } from "@/modules/projects/api/project-route-responses";
import { exportProjectGanttPdf } from "@/modules/projects/project-export-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return fileResponse(await exportProjectGanttPdf(await getProjectContext(), id));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
