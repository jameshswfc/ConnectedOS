import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError, parseJsonBody } from "@/modules/quoting/api/quoting-api-utils";
import { getProduct, softDeleteProduct, updateProduct } from "@/modules/quoting/products/product-service";
import { productUpdateSchema } from "@/modules/quoting/schemas/quoting-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getProduct(await getQuotingContext(), id)));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateProduct(await getQuotingContext(), id, await parseJsonBody(request, productUpdateSchema))));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeleteProduct(await getQuotingContext(), id)));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
