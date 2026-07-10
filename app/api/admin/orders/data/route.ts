import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user || user.role !== "ADMIN") return unauthorized();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);
  const status = searchParams.get("status") as string | null;

  const where: any = {
    deliveryInfo: { not: null },
  };
  if (status) {
    where.dataStatus = status;
  }

  const orders = await prisma.order.findMany({
    where,
    include: { payment: true, user: { select: { name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const enriched = orders.map((order) => {
    const info = (order.deliveryInfo || {}) as Record<string, unknown>;
    return {
      id: order.id,
      userId: order.userId,
      total: Number(order.total),
      status: order.status,
      dataStatus: order.dataStatus,
      createdAt: order.createdAt,
      deliveryInfo: {
        type: info.type,
        network: info.network || null,
        bundleId: info.bundleId || null,
        phone: info.phone || null,
        agentSlug: info.agentSlug || null,
        dataProvider: info.dataProvider || null,
        encartReference: info.encartReference || null,
        encartStatus: info.encartStatus || null,
        encartSubmittedAt: info.encartSubmittedAt || null,
        encartDeliveredAt: info.encartDeliveredAt || null,
        encartFailedAt: info.encartFailedAt || null,
        encartLastError: info.encartLastError || null,
        grandtechReference: info.grandtechReference || null,
        grandtechStatus: info.grandtechStatus || null,
        grandtechSubmittedAt: info.grandtechSubmittedAt || null,
        grandtechDeliveredAt: info.grandtechDeliveredAt || null,
        grandtechFailedAt: info.grandtechFailedAt || null,
        grandtechLastError: info.grandtechLastError || null,
      },
      customer: order.user,
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
