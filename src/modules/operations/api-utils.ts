import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { errorResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function getModuleContext(): Promise<CrmAccessContext> {
  const user = await requireAuthenticatedUser();
  return {
    userId: user.id,
    permissions: user.permissions,
    permissionLevel: user.permissionLevel,
    role: user.role
  };
}

type ModuleApiErrorMeta = {
  module?: string;
  action?: string;
  recordId?: string;
  userId?: string;
  payloadSummary?: unknown;
};

export function handleModuleApiError(error: unknown, meta?: ModuleApiErrorMeta) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
    console.warn("Module API validation error", { ...meta, issues: error.issues.map((entry) => ({ path: entry.path.join("."), message: entry.message })) });
    return NextResponse.json(errorResponse("VALIDATION_ERROR", `${field}${issue?.message ?? "Request validation failed."}`), { status: 400 });
  }
  if (error instanceof Error && error.message.startsWith("Missing permission")) {
    return NextResponse.json(errorResponse("FORBIDDEN", error.message), { status: 403 });
  }
  if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
    return NextResponse.json(errorResponse("NOT_FOUND", error.message), { status: 404 });
  }
  if (
    error instanceof Error
    && (
      error.message.startsWith("Invalid")
      || error.message.startsWith("Unsupported")
      || error.message.startsWith("File exceeds")
      || error.message.startsWith("Resource conflict")
      || error.message.startsWith("Selected")
      || error.message.startsWith("Please")
      || error.message.startsWith("Unable to")
    )
  ) {
    console.warn("Module API handled error", { ...meta, message: error.message });
    return NextResponse.json(errorResponse("VALIDATION_ERROR", error.message), { status: 400 });
  }
  console.error("Unexpected module API error", {
    ...meta,
    message: error instanceof Error ? error.message : String(error)
  });
  return NextResponse.json(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."), { status: 500 });
}
