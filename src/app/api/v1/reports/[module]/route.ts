import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getExecutiveReport, getModuleReport, getPresalesReport, getProcurementReport, getSalesReport } from "@/modules/reporting/reporting-service";
import { getModuleContext, handleModuleApiError } from "@/modules/operations/api-utils";

type Params = { params: Promise<{ module: string }> };
export async function GET(_request: Request, { params }: Params) {
  try {
    const { module } = await params;
    const context = await getModuleContext();
    const data = module === "executive"
      ? await getExecutiveReport(context)
      : module === "sales"
        ? await getSalesReport(context)
        : module === "presales"
          ? await getPresalesReport(context)
          : module === "procurement"
            ? await getProcurementReport(context)
            : await getModuleReport(context, module as "projects" | "resources" | "finance" | "helpdesk");
    return NextResponse.json(successResponse(data));
  } catch (error) {
    return handleModuleApiError(error);
  }
}
