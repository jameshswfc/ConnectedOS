import { NextResponse } from "next/server";
import { PresalesCommercialPriority, PresalesPriority, PresalesRequestCategory, PresalesRequestStatus, PresalesRequestType } from "@prisma/client";
import { ZodError, type z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function getPresalesContext(): Promise<CrmAccessContext> {
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

export function getPresalesFilters(request: Request) {
  const params = new URL(request.url).searchParams;
  return {
    status: enumParam(PresalesRequestStatus, params.get("status")),
    priority: enumParam(PresalesPriority, params.get("priority")),
    commercialPriority: enumParam(PresalesCommercialPriority, params.get("commercialPriority")),
    assignedToId: params.get("assignedToId") || undefined,
    requestType: enumParam(PresalesRequestType, params.get("requestType")),
    requestCategory: enumParam(PresalesRequestCategory, params.get("requestCategory")),
    dueSoon: params.get("dueSoon") === "true" ? true : undefined,
    overdue: params.get("overdue") === "true" ? true : undefined
  };
}

function enumParam<T extends Record<string, string>>(values: T, value: string | null) {
  return value && Object.values(values).includes(value) ? value as T[keyof T] : undefined;
}

export function handlePresalesApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(errorResponse("VALIDATION_ERROR", "Request validation failed."), { status: 400 });
  }

  if (error instanceof Error && error.message.startsWith("Missing permission")) {
    return NextResponse.json(errorResponse("FORBIDDEN", error.message), { status: 403 });
  }

  if (error instanceof Error && error.message.includes("not found")) {
    return NextResponse.json(errorResponse("NOT_FOUND", error.message), { status: 404 });
  }

  if (error instanceof Error && error.message.startsWith("Invalid pre-sales status transition")) {
    return NextResponse.json(errorResponse("INVALID_STATUS_TRANSITION", error.message), { status: 400 });
  }

  if (error instanceof Error && error.message.includes("read-only")) {
    return NextResponse.json(errorResponse("READ_ONLY", error.message), { status: 400 });
  }

  if (error instanceof Error && ["Unsupported file type", "Invalid file name", "Invalid file storage path", "Invalid stored file path", "No files were supplied", "File exceeds"].some((message) => error.message.startsWith(message))) {
    return NextResponse.json(errorResponse("VALIDATION_ERROR", error.message), { status: 400 });
  }

  console.error("Unexpected pre-sales API error", error);
  return NextResponse.json(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."), { status: 500 });
}
