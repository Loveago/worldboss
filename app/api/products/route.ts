import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validators";
import { ok, fail } from "@/lib/response";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const products = await prisma.product.findMany({ include: { category: true } });
  return ok(products);
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const json = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const created = await prisma.product.create({ data: parsed.data });
  return ok(created, 201);
}
