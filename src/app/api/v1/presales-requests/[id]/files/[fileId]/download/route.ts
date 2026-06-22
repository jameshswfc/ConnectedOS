import { getPresalesContext, handlePresalesApiError } from "@/modules/presales/api/presales-api-utils";
import { getPresalesFileDownload } from "@/modules/presales/presales-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, fileId } = await params;
    const download = await getPresalesFileDownload(await getPresalesContext(), id, fileId);
    return new Response(new Uint8Array(download.buffer), {
      headers: {
        "Content-Type": download.fileType,
        "Content-Disposition": `attachment; filename="${download.fileName.replace(/"/g, "")}"`,
        "Content-Length": String(download.buffer.byteLength)
      }
    });
  } catch (error) {
    return handlePresalesApiError(error);
  }
}
