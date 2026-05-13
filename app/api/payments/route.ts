import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { requireRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const payments = await prisma.payment.findMany({
    include: { order: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(payments);
}
