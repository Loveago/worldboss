import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { comparePassword, signToken, setAuthCookie } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const { email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return fail("Invalid credentials", 401);
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return fail("Invalid credentials", 401);

  const token = signToken({ id: user.id, role: user.role, email: user.email });
  setAuthCookie(token);
  return ok({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
}
