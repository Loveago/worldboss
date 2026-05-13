import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ success: true, data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: false, message, meta }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return fail(message, 401);
}

export function forbidden(message = "Forbidden") {
  return fail(message, 403);
}

export function notFound(message = "Not found") {
  return fail(message, 404);
}
