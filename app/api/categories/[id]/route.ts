import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { categorySchema } from "@/lib/validators";
import { ok, fail, notFound } from "@/lib/response";
import { requireRole } from "@/lib/rbac";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) return notFound();
  return ok(category);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const json = await req.json().catch(() => null);
  const parsed = categorySchema.partial().safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const updated = await prisma.category.update({ where: { id: params.id }, data: parsed.data });
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  await prisma.category.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
