import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";

export class ApiAuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "PASSWORD_CHANGE_REQUIRED",
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

export function apiAuthErrorResponse(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json(errorResponse(error.code, error.message), { status: error.status });
  }
  return null;
}
