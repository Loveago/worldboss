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

  // Find recent orders and filter in JS to avoid Prisma JSON path quirks
  const candidates = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { user: true, payment: true },
  });

  const orders = candidates.filter((o) => {
    const info = (o.deliveryInfo || {}) as Record<string, unknown>;
    return info.agentUserId === user.id;
  });

  const enriched = orders.map((order) => {
    const info = (order.deliveryInfo || {}) as Record<string, unknown>;
    return {
      id: order.id,
      total: Number(order.total),
      status: order.status,
      dataStatus: order.dataStatus || null,
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
