import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { assertUserPermission } from "@/services/permissions/permission-service";

export async function requireUserAdmin() {
  const user = await requireAuthenticatedUser();
  await assertUserPermission(user.id, "admin.users");
  return user;
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema): Promise<z.output<TSchema>> {
  return schema.parse(await request.json());
}

export function handleUserApiError(error: unknown) {
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
