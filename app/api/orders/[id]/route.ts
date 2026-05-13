import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, notFound, fail, unauthorized } from "@/lib/response";
import { requireRole } from "@/lib/rbac";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, payload } = await getUserFromRequest(req);
  if (!user || !payload) return unauthorized();
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true, payment: true } });
  if (!order) return notFound();
  if (payload.role !== "ADMIN" && order.userId !== user.id) return unauthorized();
  return ok(order);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const json = await req.json().catch(() => null);
  const status = json?.status as any;
  if (!status) return fail("Status required", 400);
  const updated = await prisma.order.update({ where: { id: params.id }, data: { status } });
  return ok(updated);
}
