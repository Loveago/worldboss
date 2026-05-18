import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { computeAgentTier, getAgentProfile } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      addresses: {
        path: ["agent", "status"],
        equals: "APPROVED",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      addresses: true,
      orders: {
        where: {
          deliveryInfo: {
            path: ["type"],
            equals: "AGENT_COMMISSION",
          },
          payment: {
            status: "SUCCESS",
          },
        },
        select: { total: true },
      },
    },
  });

  const items = users
    .map((user) => {
      const profile = getAgentProfile(user.addresses);
      if (!profile || profile.status !== "APPROVED") return null;
      const salesCount = user.orders.length;
      const totalCommissions = user.orders.reduce((sum, order) => sum + Number(order.total), 0);
      const tier = computeAgentTier(salesCount);
      return {
        userId: user.id,
        storefrontName: profile.storefrontName,
        storefrontSlug: profile.storefrontSlug,
        badge: tier.badge,
        tier: tier.tier,
        salesCount,
        totalCommissions,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.salesCount || 0) - (a?.salesCount || 0))
    .slice(0, 50);

  return ok(items);
}
