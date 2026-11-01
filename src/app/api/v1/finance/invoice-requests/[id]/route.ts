import { NextResponse } from "next/server";
import { z } from "zod";
import { getModuleContext } from "@/modules/operations/api-utils";
import { approveProjectInvoice, rejectProjectInvoice } from "@/modules/finance/invoice-request-service";
import { successResponse } from "@/lib/api-response";
import { sageApiError, verifySageOrigin } from "@/services/integrations/sage/sage-api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getModuleContext();
    verifySageOrigin(request);
    const id = z.string().uuid().parse((await params).id);
    const raw = await request.json();
    const action = z.enum(["approve", "reject"]).parse(raw.action);
    const result = action === "approve" ? await approveProjectInvoice(context, id, raw) : await rejectProjectInvoice(context, id, raw.reason);
    return NextResponse.json(successResponse(result));
  } catch (error) { return sageApiError(error); }
}
