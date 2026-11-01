import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiAuthErrorResponse } from "@/services/auth/api-auth-error";

export function documentApiError(error: unknown, publicRequest = false) {
  if (!publicRequest) {
    const auth = apiAuthErrorResponse(error);
    if (auth) return auth;
  }
  if (error instanceof ZodError) return NextResponse.json({ error: { message: "Please check the required fields, dates and email address.", fields: error.flatten().fieldErrors } }, { status: 400 });
  const message = error instanceof Error ? error.message : "";
  if (!publicRequest && message.startsWith("Missing permission")) return NextResponse.json({ error: { message: "You do not have permission to perform this action." } }, { status: 403 });
  const friendly = /^(Selected |Unable |Please |This invitation |Partner |Attach |Use a valid |Each attachment |Submission |Invalid attachment)/.test(message);
  if (!friendly) console.error("Document/intake operation failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: { message: friendly ? message : "Unable to complete this request. Please try again or contact Connected Hospitality." } }, { status: friendly ? 400 : 500 });
}
