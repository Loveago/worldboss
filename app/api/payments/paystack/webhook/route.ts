import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/paystack";
import { creditAgentCommissionForOrder } from "@/lib/agent-commission";
import { submitDataOrderToProvider } from "@/lib/data-provider";
import { ok, fail } from "@/lib/response";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") || undefined;
  const valid = verifyWebhookSignature(rawBody, signature);
  if (!valid) return fail("Invalid signature", 400);
  const event = JSON.parse(rawBody);
  const reference = event.data?.reference as string | undefined;
  await prisma.paystackEvent.create({
    data: {
      reference: reference || "unknown",
      event: event.event || "unknown",
      payload: event,
      verifiedSignature: true,
    },
  });
  if (reference && event.event === "charge.success") {
    await prisma.payment.update({ where: { reference }, data: { status: "SUCCESS" } }).catch(() => null);
    const orderId = event.data?.metadata?.orderId as string | undefined;
    if (orderId) {
      await prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } }).catch(() => null);
      await creditAgentCommissionForOrder(orderId, prisma).catch(() => null);
      await submitDataOrderToProvider(orderId, prisma).catch((err) => {
        console.error("[paystack-webhook] submitDataOrderToProvider failed:", err);
      });
    }
  }
  return ok({ received: true });
}
