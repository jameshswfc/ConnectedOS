import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getQuotingContext, handleQuotingApiError } from "@/modules/quoting/api/quoting-api-utils";
import { importPriceCsv, listPriceImports } from "@/modules/quoting/price-imports/price-import-service";

export async function GET() {
  try {
    return NextResponse.json(successResponse(await listPriceImports(await getQuotingContext())));
  } catch (error) {
    return handleQuotingApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("CSV file not found");
    }
    return NextResponse.json(successResponse(await importPriceCsv(await getQuotingContext(), file)), { status: 201 });
  } catch (error) {
    return handleQuotingApiError(error);
  }
}
