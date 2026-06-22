import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError, parseJsonBody } from "@/modules/quoting/api/quoting-api-utils";
import { getQuote, softDeleteQuote, updateQuote } from "@/modules/quoting/quotes/quote-service";
import { quoteUpdateSchema } from "@/modules/quoting/schemas/quoting-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await getQuote(await getQuotingContext(), id)));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateQuote(await getQuotingContext(), id, await parseJsonBody(request, quoteUpdateSchema))));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await softDeleteQuote(await getQuotingContext(), id)));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
