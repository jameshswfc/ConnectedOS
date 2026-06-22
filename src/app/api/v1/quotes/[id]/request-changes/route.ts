import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError, parseJsonBody } from "@/modules/quoting/api/quoting-api-utils";
import { requestQuoteChanges } from "@/modules/quoting/quotes/quote-approval-service";
import { quoteApprovalRejectSchema } from "@/modules/quoting/schemas/quoting-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, quoteApprovalRejectSchema);
    return NextResponse.json(successResponse(await requestQuoteChanges(await getQuotingContext(), id, body.comments)));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
