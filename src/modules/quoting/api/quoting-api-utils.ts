import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function getQuotingContext(): Promise<CrmAccessContext> {
  const user = await requireAuthenticatedUser();
  return {
    userId: user.id,
    permissions: user.permissions,
    permissionLevel: user.permissionLevel
  };
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema): Promise<z.output<TSchema>> {
  const body = await request.json();
  return schema.parse(body);
}

export function getSearchParam(request: Request) {
  return new URL(request.url).searchParams.get("search") ?? undefined;
}

export function handleQuotingApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(errorResponse("VALIDATION_ERROR", "Request validation failed."), { status: 400 });
  }

  if (error instanceof Error && error.message.startsWith("Missing permission")) {
    return NextResponse.json(errorResponse("FORBIDDEN", error.message), { status: 403 });
  }

  if (error instanceof Error && error.message.includes("not found")) {
    return NextResponse.json(errorResponse("NOT_FOUND", error.message), { status: 404 });
  }

  if (error instanceof Error && error.message.startsWith("Cannot approve your own quote")) {
    return NextResponse.json(errorResponse("FORBIDDEN", error.message), { status: 403 });
  }

  if (error instanceof Error && error.message.startsWith("PDF export failed")) {
    return NextResponse.json(errorResponse("PDF_EXPORT_ERROR", error.message), { status: 500 });
  }

  console.error("Unexpected quoting API error", error);
  return NextResponse.json(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."), { status: 500 });
}
