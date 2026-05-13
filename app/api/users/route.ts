import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { adminUserCreateSchema } from "@/lib/validators";
import { ok, fail } from "@/lib/response";
import { requireRole } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(users);
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;
  const json = await req.json().catch(() => null);
  const parsed = adminUserCreateSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const { email, password, name, phone, role } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail("Email already registered", 409);

  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone,
      role: role ?? "USER",
    },
  });

  return ok(
    {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      phone: created.phone,
      createdAt: created.createdAt,
    },
    201
  );
}
