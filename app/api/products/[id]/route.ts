import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validators";
import { ok, fail, notFound } from "@/lib/response";
import { requireRole } from "@/lib/rbac";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true },
  });
  if (!product) return notFound();
  return ok(product);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const json = await req.json().catch(() => null);
  const parsed = productSchema.partial().safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const updated = await prisma.product.update({ where: { id: params.id }, data: parsed.data });
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  await prisma.product.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
