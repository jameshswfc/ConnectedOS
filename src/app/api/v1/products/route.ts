import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, getSearchParam, handleQuotingApiError, parseJsonBody } from "@/modules/quoting/api/quoting-api-utils";
import { createProduct, listProducts } from "@/modules/quoting/products/product-service";
import { serializeProduct } from "@/modules/quoting/products/product-serializer";
import { productCreateSchema } from "@/modules/quoting/schemas/quoting-schemas";

export async function GET(request: Request) {
  try {
    const products = await listProducts(await getQuotingContext(), getSearchParam(request));
    return NextResponse.json(successResponse(products.slice(0, 50).map(serializeProduct)));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createProduct(await getQuotingContext(), await parseJsonBody(request, productCreateSchema))), { status: 201 });
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
