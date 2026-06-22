import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { addExpenseLine } from "@/modules/expenses/expense-service";
import { expenseLineCreateSchema } from "@/modules/expenses/expense-schemas";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const buffer = typeof file === "object" && file && "arrayBuffer" in file ? Buffer.from(await file.arrayBuffer()) : undefined;
      return NextResponse.json(successResponse(await addExpenseLine(
        await getModuleContext(),
        id,
        expenseLineCreateSchema.parse(Object.fromEntries(formData.entries())),
        buffer && typeof file === "object" && file ? { fileName: file.name, fileType: file.type || undefined, buffer } : undefined
      )), { status: 201 });
    }
    return NextResponse.json(successResponse(await addExpenseLine(await getModuleContext(), id, expenseLineCreateSchema.parse(await request.json()))), { status: 201 });
  } catch (error) {
    return handleModuleApiError(error);
  }
}
