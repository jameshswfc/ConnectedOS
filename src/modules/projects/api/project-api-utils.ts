import { NextResponse } from "next/server";
import { ProjectRagStatus, ProjectStatus } from "@prisma/client";
import { ZodError, type z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";
import { ProjectExportGenerationError } from "@/modules/projects/project-export-service";
import type { CrmAccessContext } from "@/modules/crm/types/crm-context";

export async function getProjectContext(): Promise<CrmAccessContext> {
  const user = await requireAuthenticatedUser();
  return {
    userId: user.id,
    permissions: user.permissions,
    permissionLevel: user.permissionLevel,
    role: user.role
  };
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema): Promise<z.output<TSchema>> {
  const body = await request.json();
  return schema.parse(body);
}

export function getProjectFilters(request: Request) {
  const params = new URL(request.url).searchParams;
  const view = params.get("view");
  return {
    view: view && ["active", "completed", "closed", "cancelled", "all"].includes(view) ? view as "active" | "completed" | "closed" | "cancelled" | "all" : undefined,
    status: enumParam(ProjectStatus, params.get("status")),
    ragStatus: enumParam(ProjectRagStatus, params.get("ragStatus")),
    projectManagerId: params.get("projectManagerId") || undefined,
    accountId: params.get("accountId") || undefined,
    dueToStart: params.get("dueToStart") === "true" ? true : undefined,
    dueToEnd: params.get("dueToEnd") === "true" ? true : undefined,
    overdue: params.get("overdue") === "true" ? true : undefined,
    endingNext30Days: params.get("endingNext30Days") === "true" ? true : undefined,
    overResourceBudget: params.get("overResourceBudget") === "true" ? true : undefined,
    openIssues: params.get("openIssues") === "true" ? true : undefined
  };
}

export function handleProjectApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(errorResponse("VALIDATION_ERROR", "Request validation failed."), { status: 400 });
  }

  if (error instanceof Error && error.message.startsWith("Missing permission")) {
    return NextResponse.json(errorResponse("FORBIDDEN", error.message), { status: 403 });
  }

  if (error instanceof Error && error.message.includes("not found")) {
    return NextResponse.json(errorResponse("NOT_FOUND", error.message), { status: 404 });
  }

  if (error instanceof ProjectExportGenerationError) {
    return NextResponse.json(errorResponse("EXPORT_FAILED", error.message), { status: 500 });
  }

  if (
    error instanceof Error
    && (
      error.message.startsWith("Invalid")
      || error.message.startsWith("Project can only")
      || error.message.startsWith("Resource conflict detected")
      || error.message.startsWith("Project change request")
      || error.message.startsWith("Approved change requests")
      || error.message.startsWith("Unable to update task dates")
      || error.message.startsWith("Actual days used are required")
      || error.message.startsWith("This dependency would create")
    )
  ) {
    return NextResponse.json(errorResponse("VALIDATION_ERROR", error.message), { status: 400 });
  }

  console.error("Unexpected projects API error", error);
  return NextResponse.json(errorResponse("INTERNAL_ERROR", "An unexpected error occurred."), { status: 500 });
}

function enumParam<T extends Record<string, string>>(values: T, value: string | null) {
  return value && Object.values(values).includes(value) ? value as T[keyof T] : undefined;
}
