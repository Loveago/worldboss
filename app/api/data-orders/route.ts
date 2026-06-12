import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const candidates = await prisma.order.findMany({
    where: {
      userId: user.id,
    },
    include: { payment: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const orders = candidates.filter((o) => {
    const info = (o.deliveryInfo || {}) as Record<string, unknown>;
    return info.type === "DATA";
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
        agentSlug: info.agentSlug || null,
      },
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
