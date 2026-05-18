import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { computeAgentTier, getAgentProfile, getAgentWalletMetrics } from "@/lib/agents";
import { ok, unauthorized, fail } from "@/lib/response";

export async function GET(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const profile = getAgentProfile(user.addresses);
  if (!profile) {
    return ok({
      hasApplication: false,
      isApproved: false,
      profile: null,
      bundles: [],
      wallet: { balance: 0, totalCommissions: 0, totalWithdrawalsReserved: 0 },
      stats: { salesCount: 0, tier: 1, badge: "Tier 1" },
      withdrawals: [],
      storefrontLink: null,
    });
  }

  const bundles = await prisma.dataBundle.findMany({ orderBy: [{ network: "asc" }, { price: "asc" }] });
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { payment: true },
    orderBy: { createdAt: "desc" },
  });

  const wallet = getAgentWalletMetrics(orders);

  const salesCount = await prisma.order.count({
    where: {
      deliveryInfo: {
        path: ["agentUserId"],
        equals: user.id,
      },
      payment: {
        status: "SUCCESS",
      },
    },
  });
  const tier = computeAgentTier(salesCount);

  const isApproved = profile.status === "APPROVED";
  const storefrontBundles = isApproved
    ? bundles.map((bundle) => {
        const markup = Number(profile.markups?.[bundle.id] || 0);
        return {
          id: bundle.id,
          network: bundle.network,
          name: bundle.name,
          volume: bundle.volume,
          validity: bundle.validity,
          basePrice: Number(bundle.price),
          markup,
          finalPrice: Number(bundle.price) + markup,
        };
      })
    : [];

  const withdrawals = orders
    .filter((order) => {
      const info = order.deliveryInfo as Record<string, unknown> | null;
      return info?.type === "AGENT_WITHDRAWAL";
    })
    .map((order) => {
      const info = order.deliveryInfo as Record<string, unknown>;
      return {
        id: order.id,
        amount: Number(order.total),
        status: order.payment?.status || "INITIATED",
        createdAt: order.createdAt,
        momoNumber: typeof info.momoNumber === "string" ? info.momoNumber : "",
        momoName: typeof info.momoName === "string" ? info.momoName : "",
        momoNetwork: typeof info.momoNetwork === "string" ? info.momoNetwork : "",
      };
    })
    .slice(0, 20);

  return ok({
    hasApplication: true,
    isApproved,
    profile,
    bundles: storefrontBundles,
    wallet,
    stats: {
      salesCount,
      tier: tier.tier,
      badge: tier.badge,
    },
    withdrawals,
    storefrontLink: isApproved ? `/agents/storefront/${profile.storefrontSlug}` : null,
  });
}

export async function PATCH(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const { agentStorefrontUpdateSchema } = await import("@/lib/validators");
  const json = await req.json().catch(() => null);
  const parsed = agentStorefrontUpdateSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const profile = getAgentProfile(user.addresses);
  if (!profile || profile.status !== "APPROVED") return fail("Only approved agents can manage storefront", 403);

  const next = {
    ...profile,
    storefrontName: parsed.data.storefrontName,
    contactPhone: parsed.data.contactPhone,
    whatsappNumber: parsed.data.whatsappNumber,
    markups: parsed.data.markups || profile.markups || {},
  };

  const { setAgentProfile } = await import("@/lib/agents");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      addresses: setAgentProfile(user.addresses, next),
    },
  });

  return ok({ updated: true });
}
