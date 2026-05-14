import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { paystack } from "@/lib/paystack";
import { fail, ok, unauthorized } from "@/lib/response";
import { walletDepositSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const json = await req.json().catch(() => null);
  const parsed = walletDepositSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const amount = Number(parsed.data.amount);
  const email = parsed.data.email || user.email;

  const topupOrder = await prisma.order.create({
    data: {
      userId: user.id,
      total: amount,
      status: "PENDING",
      deliveryInfo: {
        type: "WALLET_TOPUP",
        source: "PROFILE",
      },
    },
  });

  const amountKobo = Math.round(amount * 100);
  const init = await paystack.transaction.initialize({
    amount: amountKobo.toString(),
    email,
    currency: "GHS",
    reference: `BMW-${topupOrder.id}-${Date.now()}`,
    metadata: { orderId: topupOrder.id, userId: user.id, type: "WALLET_TOPUP" },
  });

  if (!init.data) {
    return fail(init.message || "Unable to initialize wallet deposit", 400);
  }

  const { reference, authorization_url, access_code } = init.data;
  const checkoutMeta: Prisma.InputJsonValue = {
    authorization_url,
    access_code,
    flow: "WALLET_TOPUP",
  };

  await prisma.payment.create({
    data: {
      orderId: topupOrder.id,
      reference,
      amount: topupOrder.total,
      currency: "GHS",
      status: "INITIATED",
      meta: checkoutMeta,
    },
  });

  return ok({
    orderId: topupOrder.id,
    reference,
    authorization_url,
  });
}
