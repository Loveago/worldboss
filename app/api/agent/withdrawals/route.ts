import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { fail, ok, unauthorized } from "@/lib/response";
import { AGENT_MIN_WITHDRAWAL, AGENT_WITHDRAW_FEE, getAgentProfile, getAgentWalletMetrics } from "@/lib/agents";
import { agentWithdrawalCreateSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const profile = getAgentProfile(user.addresses);
  if (!profile || profile.status !== "APPROVED") return fail("Only approved agents can request withdrawals", 403);

  const json = await req.json().catch(() => null);
  const parsed = agentWithdrawalCreateSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const amount = Number(parsed.data.amount);
  if (amount < AGENT_MIN_WITHDRAWAL) {
    return fail(`Minimum withdrawal is ${AGENT_MIN_WITHDRAWAL} GHS`, 400);
  }
  if (amount <= AGENT_WITHDRAW_FEE) {
    return fail("Withdrawal amount must be greater than processing fee", 400);
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { payment: true },
  });
  const wallet = getAgentWalletMetrics(orders);
  if (wallet.balance < amount) {
    return fail("Insufficient agent wallet balance", 400, {
      required: amount,
      available: wallet.balance,
    });
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      total: amount,
      status: "PENDING",
      items: { create: [] },
      deliveryInfo: {
        type: "AGENT_WITHDRAWAL",
        grossAmount: amount,
        fee: AGENT_WITHDRAW_FEE,
        netAmount: amount - AGENT_WITHDRAW_FEE,
        momoNumber: parsed.data.momoNumber,
        momoName: parsed.data.momoName,
        momoNetwork: parsed.data.momoNetwork,
      },
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: "agent-withdrawal",
      reference: `AGENT-WD-${order.id}`,
      amount: order.total,
      currency: "GHS",
      status: "INITIATED",
      meta: {
        type: "AGENT_WITHDRAWAL",
      },
    },
  });

  return ok({ requested: true, withdrawalId: order.id });
}
