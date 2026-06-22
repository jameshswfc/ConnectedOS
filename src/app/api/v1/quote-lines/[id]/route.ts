import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError, parseJsonBody } from "@/modules/quoting/api/quoting-api-utils";
import { deleteQuoteLine, updateQuoteLine } from "@/modules/quoting/quotes/quote-service";
import { quoteLineUpdateSchema } from "@/modules/quoting/schemas/quoting-schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateQuoteLine(await getQuotingContext(), id, await parseJsonBody(request, quoteLineUpdateSchema))));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await deleteQuoteLine(await getQuotingContext(), id)));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
