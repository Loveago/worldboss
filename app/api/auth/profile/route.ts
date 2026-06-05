import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/validators";
import { getAgentProfile } from "@/lib/agents";
import { fail, ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();
  const agentProfile = getAgentProfile(user.addresses);

  return ok({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt,
    agentStatus: agentProfile?.status || null,
  });
}

export async function PATCH(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const json = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      ...(parsed.data.phone ? { phone: parsed.data.phone.trim() } : {}),
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      createdAt: true,
    },
  });

  return ok(updated);
}
