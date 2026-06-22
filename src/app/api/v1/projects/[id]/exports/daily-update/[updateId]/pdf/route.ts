import { getProjectContext, handleProjectApiError } from "@/modules/projects/api/project-api-utils";
import { fileResponse } from "@/modules/projects/api/project-route-responses";
import { exportProjectFormPdf } from "@/modules/projects/project-export-service";

type Params = { params: Promise<{ id: string; updateId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, updateId } = await params;
    return fileResponse(await exportProjectFormPdf(await getProjectContext(), id, updateId));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
