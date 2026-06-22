import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError } from "@/modules/quoting/api/quoting-api-utils";
import { createQuoteVersion } from "@/modules/quoting/quotes/quote-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await createQuoteVersion(await getQuotingContext(), id)), { status: 201 });
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
