import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { paystack } from "@/lib/paystack";
import { ok, fail } from "@/lib/response";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { user, payload } = await getUserFromRequest(req);
  if (!user || !payload) return fail("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  const { orderId, email } = body || {};
  if (!orderId || !email) return fail("orderId and email are required", 400);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return fail("Order not found", 404);
  const amountKobo = Number(order.total) * 100;
  const init = await paystack.transaction.initialize({
    amount: amountKobo,
    email,
    currency: "GHS",
    reference: `BM-${order.id}-${Date.now()}`,
    metadata: { orderId: order.id, userId: user.id },
  });
  await prisma.payment.create({
    data: {
      orderId: order.id,
      reference: init.reference,
      amount: order.total,
      currency: "GHS",
      status: "INITIATED",
      meta: init,
    },
  });
  return ok(init);
}
