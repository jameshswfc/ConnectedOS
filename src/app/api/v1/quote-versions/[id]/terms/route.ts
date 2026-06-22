import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError, parseJsonBody } from "@/modules/quoting/api/quoting-api-utils";
import { updateQuoteVersionTerms } from "@/modules/quoting/quotes/quote-service";
import { quoteVersionTermsUpdateSchema } from "@/modules/quoting/schemas/quoting-schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await updateQuoteVersionTerms(await getQuotingContext(), id, await parseJsonBody(request, quoteVersionTermsUpdateSchema))));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
