import { PrismaClient, Prisma } from "@prisma/client";

export async function creditAgentCommissionForOrder(orderId: string, prisma: PrismaClient) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order || order.payment?.status !== "SUCCESS") return;

  const info = order.deliveryInfo as Record<string, unknown> | null;
  if (!info || info.type !== "DATA") return;
  if (info.commissionCredited === true) return;

  const agentUserId = typeof info.agentUserId === "string" ? info.agentUserId : "";
  const agentMarkup = typeof info.agentMarkup === "number" ? info.agentMarkup : 0;
  if (!agentUserId || agentMarkup <= 0) return;

  const reference = `AGENT-COMM-${order.id}`;

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.order.findUnique({ where: { id: order.id }, include: { payment: true } });
    if (!fresh || fresh.payment?.status !== "SUCCESS") return;
    const freshInfo = fresh.deliveryInfo as Record<string, unknown> | null;
    if (!freshInfo || freshInfo.commissionCredited === true) return;

    const payoutOrder = await tx.order.create({
      data: {
        userId: agentUserId,
        total: agentMarkup,
        status: "PAID",
        deliveryInfo: {
          type: "AGENT_COMMISSION",
          sourceOrderId: order.id,
          storefrontSlug: typeof freshInfo.agentSlug === "string" ? freshInfo.agentSlug : null,
        },
      },
    });

    await tx.payment.create({
      data: {
        orderId: payoutOrder.id,
        provider: "agent-commission",
        reference,
        amount: payoutOrder.total,
        currency: "GHS",
        status: "SUCCESS",
        meta: {
          type: "AGENT_COMMISSION",
          sourceOrderId: order.id,
        } as Prisma.InputJsonValue,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        deliveryInfo: {
          ...(freshInfo || {}),
          commissionCredited: true,
        },
      },
    });
  });
}
