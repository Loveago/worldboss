import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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
  const amountKobo = Math.round(Number(order.total) * 100);
  const init = await paystack.transaction.initialize({
    amount: amountKobo.toString(),
    email,
    currency: "GHS",
    reference: `BM-${order.id}-${Date.now()}`,
    metadata: { orderId: order.id, userId: user.id },
  });
  if (!init.data) {
    return fail(init.message || "Unable to initialize Paystack checkout", 400);
  }
  const { reference, authorization_url, access_code } = init.data;
  const checkoutMeta: Prisma.InputJsonValue = {
    authorization_url,
    access_code,
  };
  await prisma.payment.create({
    data: {
      orderId: order.id,
      reference,
      amount: order.total,
      currency: "GHS",
      status: "INITIATED",
      meta: checkoutMeta,
    },
  });
  return ok(init);
}
