import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, unauthorized, fail } from "@/lib/response";

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const { user } = await getUserFromRequest(req);
  if (!user || user.role !== "ADMIN") return unauthorized();

  const body = await req.json().catch(() => ({}));
  const { dataStatus } = body as { dataStatus?: string };

  if (!dataStatus || !["PLACED", "PROCESSING", "DELIVERED", "FAILED", "PENDING"].includes(dataStatus)) {
    return fail("dataStatus must be one of: PLACED, PROCESSING, DELIVERED, FAILED, PENDING", 400);
  }

  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order) return fail("Order not found", 404);

  const deliveryInfo = ((order.deliveryInfo || {}) as Record<string, unknown>) || {};
  const nextInfo = {
    ...deliveryInfo,
    encartStatus: dataStatus.toLowerCase(),
    encartManuallySetAt: new Date().toISOString(),
    encartPreviousStatus: order.dataStatus || "null",
  };

  await prisma.order.update({
    where: { id: order.id },
    data: {
      dataStatus: dataStatus as any,
      deliveryInfo: nextInfo as any,
    },
  });

  return ok({ id: order.id, dataStatus, previousStatus: order.dataStatus });
}
