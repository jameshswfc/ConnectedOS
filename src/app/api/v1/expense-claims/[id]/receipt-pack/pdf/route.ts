import { generateExpenseReceiptPack } from "@/modules/expenses/expense-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const buffer = await generateExpenseReceiptPack(await getModuleContext(), id);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="expense-${id}.pdf"`
      }
    });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
