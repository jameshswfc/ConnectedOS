import { generatePurchaseOrderPdf } from "@/modules/procurement/procurement-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const buffer = await generatePurchaseOrderPdf(await getModuleContext(), id);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="purchase-order-${id}.pdf"`
      }
    });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
