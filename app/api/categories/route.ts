import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { categorySchema } from "@/lib/validators";
import { ok, fail } from "@/lib/response";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const categories = await prisma.category.findMany({ include: { children: true } });
  return ok(categories);
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const json = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const data = parsed.data;
  const created = await prisma.category.create({ data });
  return ok(created, 201);
}
