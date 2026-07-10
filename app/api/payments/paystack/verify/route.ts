import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { paystack } from "@/lib/paystack";
import { creditAgentCommissionForOrder } from "@/lib/agent-commission";
import { submitDataOrderToProvider } from "@/lib/data-provider";
import { ok, fail } from "@/lib/response";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const reference = body?.reference as string;
  if (!reference) return fail("reference required", 400);
  const verification = await paystack.transaction.verify(reference);
  if (!verification.data) {
    return fail(verification.message || "Unable to verify payment", 400);
  }
  const status = verification.data.status === "success" ? "SUCCESS" : "FAILED";
  const payment = await prisma.payment.update({
    where: { reference },
    data: { status },
    include: {
      order: {
        select: {
          id: true,
          deliveryInfo: true,
        },
      },
    },
  });
  const metadataOrderId = verification.data.metadata?.orderId as string | undefined;
  const orderId = metadataOrderId || payment.orderId;
  const deliveryInfo = (payment.order?.deliveryInfo || {}) as Record<string, unknown>;
  const storefrontSlug = typeof deliveryInfo.agentSlug === "string" ? deliveryInfo.agentSlug : undefined;
  if (status === "SUCCESS") {
    if (orderId) {
      await prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } });
      await creditAgentCommissionForOrder(orderId, prisma);
      await submitDataOrderToProvider(orderId, prisma);
    }
  }
  return ok({ status, verification, storefrontSlug });
}
