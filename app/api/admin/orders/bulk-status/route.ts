import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, unauthorized, fail } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user || user.role !== "ADMIN") return unauthorized();

  const body = await req.json().catch(() => ({}));
  const dataStatus = body.dataStatus || "DELIVERED";

  if (!["PLACED", "PROCESSING", "DELIVERED", "FAILED", "PENDING"].includes(dataStatus)) {
    return fail("dataStatus must be one of: PLACED, PROCESSING, DELIVERED, FAILED, PENDING", 400);
  }

  const orders = await prisma.order.findMany({});

  const dataOrders = orders.filter((order) => {
    const info = (order.deliveryInfo || {}) as Record<string, unknown>;
    return info.type === "DATA" && order.status === "PAID";
  });

  let updated = 0;
  for (const order of dataOrders) {
    if (order.dataStatus === dataStatus) continue;

    const info = (order.deliveryInfo || {}) as Record<string, unknown>;
    const nextInfo = {
      ...info,
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
    updated++;
  }

  return ok({ updated, total: dataOrders.length, dataStatus });
}
