import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { fail, ok, unauthorized } from "@/lib/response";
import { walletChargeSchema } from "@/lib/validators";
import { getUserWalletMetrics, isWalletTopupOrder } from "@/lib/wallet";
import { submitDataOrderToProvider } from "@/lib/data-provider";
import { creditAgentCommissionForOrder } from "@/lib/agent-commission";

export async function POST(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const json = await req.json().catch(() => null);
  const parsed = walletChargeSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const { orderId } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order || order.userId !== user.id) {
      return { error: fail("Order not found", 404) };
    }

    if (isWalletTopupOrder(order.deliveryInfo)) {
      return { error: fail("Top-up orders cannot be paid with wallet", 400) };
    }

    if (order.status === "PAID" || order.status === "SHIPPED" || order.status === "DELIVERED") {
      return { error: fail("Order is already paid", 400) };
    }

    if (order.payment) {
      return { error: fail("This order already has a payment attempt", 400) };
    }

    const wallet = await getUserWalletMetrics(user.id, tx);
    const orderTotal = Number(order.total);
    if (wallet.balance < orderTotal) {
      return {
        error: fail("Insufficient wallet balance", 400, {
          required: orderTotal,
          available: wallet.balance,
        }),
      };
    }

    const reference = `WALLET-${order.id}-${Date.now()}`;

    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: "wallet",
        reference,
        amount: order.total,
        currency: "GHS",
        status: "SUCCESS",
        meta: {
          type: "WALLET_DEBIT",
          source: "CHECKOUT",
        },
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });

    return {
      success: true,
      orderId: order.id,
      paidAmount: orderTotal,
      remainingBalance: Math.max(wallet.balance - orderTotal, 0),
      reference,
    };
  });

  if ("error" in result) return result.error;

  // Submit DATA orders to the active provider after wallet payment succeeds.
  await creditAgentCommissionForOrder(result.orderId, prisma).catch((err) => {
    console.error("[wallet-charge] creditAgentCommissionForOrder failed:", err);
  });
  await submitDataOrderToProvider(result.orderId, prisma).catch((err) => {
    console.error("[wallet-charge] submitDataOrderToProvider failed:", err);
  });

  return ok(result);
}
