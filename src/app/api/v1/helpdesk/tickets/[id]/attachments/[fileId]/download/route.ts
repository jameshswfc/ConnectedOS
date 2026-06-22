import { getHelpdeskAttachmentDownload } from "@/modules/helpdesk/helpdesk-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, fileId } = await params;
    const download = await getHelpdeskAttachmentDownload(await getModuleContext(), id, fileId);
    return new Response(new Uint8Array(download.buffer), {
      headers: {
        "Content-Type": download.document.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${download.document.fileName.replace(/"/g, "")}"`,
        "Content-Length": String(download.buffer.byteLength)
      }
    });
  } catch (error) {
    return handleModuleApiError(error, { module: "helpdesk", action: "download_attachment" });
  }
}
