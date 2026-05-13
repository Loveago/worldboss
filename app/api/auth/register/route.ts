import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/validators";
import { comparePassword, hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { prisma } = await import("@/lib/db");
  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const { email, password, name, phone } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail("Email already registered", 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name, phone, role: "USER" } });
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  setAuthCookie(token);
  return ok({ user: { id: user.id, email: user.email, role: user.role, name: user.name } }, 201);
}
