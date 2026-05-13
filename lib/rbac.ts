import { forbidden, unauthorized } from "./response";
import { verifyToken } from "./auth";
import { NextRequest } from "next/server";
import type { Role } from "@prisma/client";

export function requireAuth(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return unauthorized();
  const payload = verifyToken(token);
  if (!payload) return unauthorized();
  return payload;
}

export function requireRole(req: NextRequest, roles: Role[]) {
  const payload = requireAuth(req);
  if ("body" in payload) return payload; // response returned
  if (!roles.includes(payload.role)) return forbidden();
  return payload;
}
