import { NextResponse } from "next/server";
import { getModuleContext } from "@/modules/operations/api-utils";
import { finishSageConnection } from "@/services/integrations/sage/sage-service";
import { sageApiError } from "@/services/integrations/sage/sage-api";
import { sageConfig } from "@/services/integrations/sage/sage-security";

export async function GET(request: Request) {
  try {
    const context = await getModuleContext();
    const params = new URL(request.url).searchParams;
    const code = params.get("code"), state = params.get("state");
    if (params.has("error") || !code || !state || code.length > 4096 || state.length > 200) throw new Error("Unable to authorise Sage. Please start the connection again.");
    await finishSageConnection(context, code, state);
    const response = NextResponse.redirect(new URL("/finance/sage?connected=true", sageConfig().redirectUri));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) { return sageApiError(error); }
}
