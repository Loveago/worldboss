import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, unauthorized, fail } from "@/lib/response";
import { getAgentProfile } from "@/lib/agents";

export async function GET(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const profile = getAgentProfile(user.addresses);
  if (!profile || profile.status !== "APPROVED") {
    return fail("Only approved agents can view storefront orders", 403);
  }

  // Find all data orders where deliveryInfo.agentUserId matches this agent
  const orders = await prisma.order.findMany({
    where: {
      deliveryInfo: {
        path: ["agentUserId"],
        equals: user.id,
      },
    },
    include: { user: true, payment: true },
    orderBy: { createdAt: "desc" },
  });

  const enriched = orders.map((order) => {
    const info = (order.deliveryInfo || {}) as Record<string, unknown>;
    return {
      id: order.id,
      total: Number(order.total),
      status: order.status,
      dataStatus: (order as any).dataStatus || null,
      createdAt: order.createdAt,
      deliveryInfo: {
        network: info.network || null,
        bundleId: info.bundleId || null,
        phone: info.phone || null,
        basePrice: info.basePrice || null,
        agentMarkup: info.agentMarkup || null,
        guestCheckout: info.guestCheckout || false,
      },
      customer: order.user
        ? {
            name: order.user.name,
            email: order.user.email,
            phone: order.user.phone,
          }
        : null,
      payment: order.payment
        ? {
            reference: order.payment.reference,
            status: order.payment.status,
          }
        : null,
    };
  });

  return ok(enriched);
}
