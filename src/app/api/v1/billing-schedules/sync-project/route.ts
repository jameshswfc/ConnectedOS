import { NextResponse } from "next/server";
import { z } from "zod";
import { successResponse } from "@/lib/api-response";
import { ensureDefaultProjectBillingSchedule } from "@/modules/finance/finance-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

const schema = z.object({ projectId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    return NextResponse.json(successResponse(await ensureDefaultProjectBillingSchedule(await getModuleContext(), body.projectId)));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
