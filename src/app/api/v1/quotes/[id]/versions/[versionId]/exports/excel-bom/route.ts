import { getQuotingContext, handleQuotingApiError } from "@/modules/quoting/api/quoting-api-utils";
import { exportQuoteExcelBom } from "@/modules/quoting/quotes/quote-export-service";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, versionId } = await params;
    const exportResult = await exportQuoteExcelBom(await getQuotingContext(), id, versionId);
    return new Response(new Uint8Array(exportResult.buffer), {
      headers: {
        "Content-Type": exportResult.contentType,
        "Content-Disposition": `attachment; filename="${exportResult.filename}"`
      }
    });
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
