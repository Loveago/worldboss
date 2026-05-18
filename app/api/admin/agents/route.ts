import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { fail, ok } from "@/lib/response";
import { agentApplicationReviewSchema } from "@/lib/validators";
import { getAgentProfile, setAgentProfile } from "@/lib/agents";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;

  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      name: true,
      email: true,
      addresses: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const items = users
    .map((user) => {
      const profile = getAgentProfile(user.addresses);
      if (!profile) return null;
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        status: profile.status,
        storefrontName: profile.storefrontName,
        storefrontSlug: profile.storefrontSlug,
        contactPhone: profile.contactPhone,
        whatsappNumber: profile.whatsappNumber,
        adminBundlePrices: profile.adminBundlePrices || {},
        appliedAt: profile.appliedAt,
      };
    })
    .filter(Boolean);

  return ok(items);
}

export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;

  const json = await req.json().catch(() => null);
  const parsed = agentApplicationReviewSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return fail("User not found", 404);

  const profile = getAgentProfile(target.addresses);
  if (!profile) return fail("No agent application found", 404);

  const isApprove = parsed.data.action === "APPROVE";
  const nextProfile = {
    ...profile,
    status: isApprove ? ("APPROVED" as const) : ("REJECTED" as const),
    approvedAt: isApprove ? new Date().toISOString() : profile.approvedAt,
    approvedByUserId: isApprove ? auth.id : profile.approvedByUserId,
    rejectedAt: !isApprove ? new Date().toISOString() : profile.rejectedAt,
    rejectedByUserId: !isApprove ? auth.id : profile.rejectedByUserId,
  };

  await prisma.user.update({
    where: { id: target.id },
    data: {
      addresses: setAgentProfile(target.addresses, nextProfile),
    },
  });

  return ok({ reviewed: true, status: nextProfile.status });
}
