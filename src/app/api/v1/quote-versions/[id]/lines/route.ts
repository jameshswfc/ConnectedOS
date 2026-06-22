import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError, parseJsonBody } from "@/modules/quoting/api/quoting-api-utils";
import { createQuoteLine } from "@/modules/quoting/quotes/quote-service";
import { quoteLineCreateSchema } from "@/modules/quoting/schemas/quoting-schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(successResponse(await createQuoteLine(await getQuotingContext(), id, await parseJsonBody(request, quoteLineCreateSchema))), { status: 201 });
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
