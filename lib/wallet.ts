import { Prisma, PrismaClient } from "@prisma/client";

const successfulOrderStatuses = new Set(["PAID", "SHIPPED", "DELIVERED"]);

type WalletOrder = {
  total: Prisma.Decimal;
  status: string;
  deliveryInfo: Prisma.JsonValue;
  payment: {
    status: string;
    provider: string;
  } | null;
};

type WalletDbClient = PrismaClient | Prisma.TransactionClient;

export const isWalletTopupOrder = (deliveryInfo: unknown) => {
  if (!deliveryInfo || typeof deliveryInfo !== "object") return false;
  return ((deliveryInfo as { type?: string }).type || "") === "WALLET_TOPUP";
};

export function deriveWalletMetrics(orders: WalletOrder[]) {
  const topupOrders = orders.filter((order) => isWalletTopupOrder(order.deliveryInfo));
  const walletSpendOrders = orders.filter(
    (order) => !isWalletTopupOrder(order.deliveryInfo) && order.payment?.provider === "wallet"
  );

  const totalDeposited = topupOrders.reduce((sum, order) => {
    const isSuccess = order.payment?.status === "SUCCESS";
    return isSuccess ? sum + Number(order.total) : sum;
  }, 0);

  const pendingDeposits = topupOrders.reduce((sum, order) => {
    const isPending = !order.payment || order.payment.status === "INITIATED";
    return isPending ? sum + Number(order.total) : sum;
  }, 0);

  const totalSpentFromWallet = walletSpendOrders.reduce((sum, order) => {
    const isSuccess = order.payment?.status === "SUCCESS" || successfulOrderStatuses.has(order.status);
    return isSuccess ? sum + Number(order.total) : sum;
  }, 0);

  const balance = Math.max(totalDeposited - totalSpentFromWallet, 0);

  return {
    balance,
    totalDeposited,
    pendingDeposits,
    totalSpentFromWallet,
    topupOrders,
    walletSpendOrders,
  };
}

export async function getUserWalletMetrics(userId: string, client: WalletDbClient) {
  const orders = await client.order.findMany({
    where: { userId },
    include: { payment: true },
    orderBy: { createdAt: "desc" },
  });

  return deriveWalletMetrics(orders as WalletOrder[]);
}
