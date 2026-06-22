import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError, parseJsonBody } from "@/modules/quoting/api/quoting-api-utils";
import { createQuote, listQuotes } from "@/modules/quoting/quotes/quote-service";
import { quoteCreateSchema } from "@/modules/quoting/schemas/quoting-schemas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(successResponse(await listQuotes(await getQuotingContext(), {
      search: searchParams.get("search") ?? undefined,
      salespersonId: searchParams.get("salespersonId"),
      myQuotes: searchParams.get("my") === "1"
    })));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(successResponse(await createQuote(await getQuotingContext(), await parseJsonBody(request, quoteCreateSchema))), { status: 201 });
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
