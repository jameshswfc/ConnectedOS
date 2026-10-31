import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { apiAuthErrorResponse } from "@/services/auth/api-auth-error";
import { ZodError } from "zod";

export function verifySageOrigin(request: Request) {
  const expected = new URL(process.env.NEXTAUTH_URL || request.url).origin;
  if (request.headers.get("origin") !== expected) throw new Error("Missing permission: same-origin request required");
}
export function sageApiError(error: unknown) {
  const auth = apiAuthErrorResponse(error);
  if (auth) return auth;
  if (error instanceof ZodError) return NextResponse.json(errorResponse("VALIDATION_ERROR", error.issues[0]?.message || "Please check the required fields."), { status: 400 });
  const message = error instanceof Error ? error.message : "";
  const forbidden = message.startsWith("Missing permission");
  const known = message.startsWith("Unable to") || message.startsWith("Invalid");
  return NextResponse.json(errorResponse(forbidden ? "FORBIDDEN" : known ? "SAGE_VALIDATION" : "SAGE_UNAVAILABLE", forbidden ? "You do not have permission to perform this action." : known ? message : "Unable to complete the Sage request. Please try again or contact an administrator."), { status: forbidden ? 403 : known ? 400 : 502, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
