import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { fail, ok } from "@/lib/response";
import { adminAgentBundlePricingSchema } from "@/lib/validators";
import { getAgentProfile, setAgentProfile } from "@/lib/agents";

export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;

  const json = await req.json().catch(() => null);
  const parsed = adminAgentBundlePricingSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return fail("Agent not found", 404);

  const profile = getAgentProfile(target.addresses);
  if (!profile || profile.status !== "APPROVED") {
    return fail("Only approved agents can have admin pricing", 400);
  }

  const nextAdminBundlePrices = { ...(profile.adminBundlePrices || {}) };
  for (const [bundleId, value] of Object.entries(parsed.data.bundlePrices)) {
    if (value === null) {
      delete nextAdminBundlePrices[bundleId];
      continue;
    }
    nextAdminBundlePrices[bundleId] = value;
  }

  const nextProfile = {
    ...profile,
    adminBundlePrices: nextAdminBundlePrices,
  };

  await prisma.user.update({
    where: { id: target.id },
    data: {
      addresses: setAgentProfile(target.addresses, nextProfile),
    },
  });

  return ok({ updated: true, userId: target.id, bundlePrices: nextAdminBundlePrices });
}
