import { NextResponse } from "next/server";

import type { ApiError } from "@/types/api";

// Route-layer helpers that produce a NextResponse with a body matching the
// service-layer ApiResponse<T> contract. The intent is one shape, one set of
// helpers, used by every route handler — so the client-side parser at
// `src/lib/api-error.ts` and TanStack Query queries see the same envelope
// regardless of which route they call.
//
//   ok(data)          → 200  { data }
//   ok(data, 201)     → 201  { data }
//   err("msg", 400)   → 400  { error: { message, status } }
//   err({ message, code, status })
//   forbidden()       → 403  { error: { message: "Forbidden", status: 403 } }
//   unauthorized()    → 401  { error: { message: "Unauthorized", status: 401 } }

export function ok<T>(data: T, init?: number | ResponseInit): NextResponse {
  if (typeof init === "number") return NextResponse.json({ data }, { status: init });
  return NextResponse.json({ data }, init);
}

export function err(
  messageOrError: string | ApiError,
  status?: number,
  code?: string
): NextResponse {
  const error: ApiError =
    typeof messageOrError === "string"
      ? { message: messageOrError, status: status ?? 500, ...(code ? { code } : {}) }
      : messageOrError;
  return NextResponse.json({ error }, { status: error.status });
}

export function forbidden(message = "Forbidden"): NextResponse {
  return err(message, 403);
}

export function unauthorized(message = "Unauthorized"): NextResponse {
  return err(message, 401);
}
