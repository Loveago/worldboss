import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { agentApplySchema } from "@/lib/validators";
import { fail, ok, unauthorized } from "@/lib/response";
import { generateStorefrontSlug, getAgentProfile, setAgentProfile } from "@/lib/agents";

async function resolveUniqueSlug(base: string, userId: string) {
  let candidate = base;
  let counter = 1;
  while (true) {
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        addresses: {
          path: ["agent", "storefrontSlug"],
          equals: candidate,
        },
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

export async function POST(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const json = await req.json().catch(() => null);
  const parsed = agentApplySchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const existing = getAgentProfile(user.addresses);
  if (existing?.status === "APPROVED") return fail("You are already an approved agent", 400);
  if (existing?.status === "PENDING") return fail("Your application is already pending review", 400);

  const baseSlug = generateStorefrontSlug(parsed.data.storefrontName, user.id);
  const storefrontSlug = await resolveUniqueSlug(baseSlug, user.id);

  const profile = {
    status: "PENDING" as const,
    storefrontSlug,
    storefrontName: parsed.data.storefrontName,
    contactPhone: parsed.data.contactPhone,
    whatsappNumber: parsed.data.whatsappNumber,
    markups: {},
    appliedAt: new Date().toISOString(),
  };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      addresses: setAgentProfile(user.addresses, profile),
    },
    select: { id: true, email: true, name: true, addresses: true },
  });

  return ok({
    userId: updated.id,
    storefrontSlug,
    status: profile.status,
  });
}
