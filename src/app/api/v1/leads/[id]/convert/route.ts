import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getCrmContext, handleApiError } from "@/modules/crm/api/crm-api-utils";
import { convertLead, LeadConversionError } from "@/modules/crm/leads/lead-conversion-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string | undefined;
  const { id } = await params;
  try {
    const context = await getCrmContext();
    userId = context.userId;
    z.string().uuid().parse(id);
    return NextResponse.json(successResponse(await convertLead(context, id, await request.json())));
  } catch (error) {
    if (error instanceof LeadConversionError || error instanceof ZodError || error instanceof SyntaxError) {
      const message = error instanceof LeadConversionError ? error.message : error instanceof ZodError ? error.issues[0].message : "Please check the conversion form and try again.";
      return NextResponse.json(errorResponse("VALIDATION_ERROR", message), { status: 400 });
    }
    const response = handleApiError(error);
    if (response.status < 500) return response;
    console.error("[crm:convert-lead]", { leadId: id, userId, message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(errorResponse("CONVERSION_FAILED", "Unable to convert this lead. Please refresh and try again."), { status: 500 });
  }
}
