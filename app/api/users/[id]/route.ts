import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminUserUpdateSchema } from "@/lib/validators";
import { ok, fail, notFound } from "@/lib/response";
import { requireRole } from "@/lib/rbac";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  });
  if (!user) return notFound("User not found");
  return ok(user);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;

  const json = await req.json().catch(() => null);
  const parsed = adminUserUpdateSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  });

  return ok(updated);
}
