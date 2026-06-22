import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError } from "@/modules/quoting/api/quoting-api-utils";
import { approveQuote } from "@/modules/quoting/quotes/quote-approval-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await approveQuote(await getQuotingContext(), id)));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
