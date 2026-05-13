import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/response";
import { requireRole } from "@/lib/rbac";
import { dataBundleSchema } from "@/lib/validators";

export async function GET() {
  const bundles = await prisma.dataBundle.findMany({ orderBy: [{ network: "asc" }, { price: "asc" }] });
  return ok(bundles);
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const json = await req.json().catch(() => null);
  const parsed = dataBundleSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const created = await prisma.dataBundle.create({ data: parsed.data });
  return ok(created, 201);
}
