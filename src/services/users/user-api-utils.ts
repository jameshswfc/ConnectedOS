import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { requireAuthenticatedApiUser } from "@/services/auth/auth-service";
import { apiAuthErrorResponse } from "@/services/auth/api-auth-error";
import { assertUserPermission } from "@/services/permissions/permission-service";
import { UserManagementValidationError } from "./user-service";

export async function requireUserAdmin() {
  const user = await requireAuthenticatedApiUser();
  await assertUserPermission(user.id, "admin.users");
  return user;
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema): Promise<z.output<TSchema>> {
  return schema.parse(await request.json());
}

export function handleUserApiError(error: unknown) {
  if (error instanceof UserManagementValidationError) return NextResponse.json(errorResponse("VALIDATION_ERROR", error.message), { status: 400 });
  const authResponse = apiAuthErrorResponse(error);
  if (authResponse) return authResponse;
  if (error instanceof ZodError) {
    return NextResponse.json(errorResponse("VALIDATION_ERROR", "Request validation failed."), { status: 400 });
  }

  if (error instanceof Error && error.message.startsWith("Missing permission")) {
    return NextResponse.json(errorResponse("FORBIDDEN", error.message), { status: 403 });
  }

  if (error instanceof Error && error.message.includes("not found")) {
    return NextResponse.json(errorResponse("NOT_FOUND", error.message), { status: 404 });
  }

  if (error instanceof Error && (error.message.includes("Password") || error.message.includes("Current password"))) {
    return NextResponse.json(errorResponse("VALIDATION_ERROR", error.message), { status: 400 });
  }

  console.error("Unexpected user API error", error);
  return NextResponse.json(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."), { status: 500 });
}
