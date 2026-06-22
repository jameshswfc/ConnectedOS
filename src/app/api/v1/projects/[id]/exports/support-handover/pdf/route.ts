import { getProjectContext, handleProjectApiError } from "@/modules/projects/api/project-api-utils";
import { fileResponse } from "@/modules/projects/api/project-route-responses";
import { ensureProjectForm, exportProjectFormPdf } from "@/modules/projects/project-export-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const form = await ensureProjectForm(await getProjectContext(), id, "support_handover");
    return fileResponse(await exportProjectFormPdf(await getProjectContext(), id, form.id));
  } catch (error) {
    return handleProjectApiError(error);
  }
}
