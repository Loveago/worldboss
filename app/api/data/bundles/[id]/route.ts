import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, notFound } from "@/lib/response";
import { requireRole } from "@/lib/rbac";
import { dataBundleUpdateSchema } from "@/lib/validators";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const bundle = await prisma.dataBundle.findUnique({ where: { id: params.id } });
  if (!bundle) return notFound("Bundle not found");
  return ok(bundle);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const json = await req.json().catch(() => null);
  const parsed = dataBundleUpdateSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const updated = await prisma.dataBundle.update({ where: { id: params.id }, data: parsed.data });
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  await prisma.dataBundle.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
