import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { paystack } from "@/lib/paystack";
import { creditAgentCommissionForOrder } from "@/lib/agent-commission";
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
  await prisma.payment.update({ where: { reference }, data: { status } });
  if (status === "SUCCESS") {
    const orderId = verification.data.metadata?.orderId as string | undefined;
    if (orderId) {
      await prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } });
      await creditAgentCommissionForOrder(orderId, prisma);
    }
  }
  return ok({ status, verification });
}
