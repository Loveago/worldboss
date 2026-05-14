import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { getUserWalletMetrics, isWalletTopupOrder } from "@/lib/wallet";
import { ok, unauthorized } from "@/lib/response";

const successfulOrderStatuses = new Set(["PAID", "SHIPPED", "DELIVERED"]);

export async function GET(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true, payment: true },
    orderBy: { createdAt: "desc" },
  });

  const walletMetrics = await getUserWalletMetrics(user.id, prisma);

  const walletOrders = orders.filter((order) => isWalletTopupOrder(order.deliveryInfo));
  const walletTransactions = walletOrders
    .map((order) => ({
      id: order.id,
      amount: Number(order.total),
      status: order.payment?.status || "INITIATED",
      reference: order.payment?.reference || null,
      createdAt: order.createdAt,
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const shoppingOrders = orders.filter((order) => !isWalletTopupOrder(order.deliveryInfo));
  const totalSpent = shoppingOrders.reduce((sum, order) => {
    const hasPaidStatus = successfulOrderStatuses.has(order.status);
    const paymentSuccess = order.payment?.status === "SUCCESS";
    return hasPaidStatus || paymentSuccess ? sum + Number(order.total) : sum;
  }, 0);

  const orderSummary = {
    total: shoppingOrders.length,
    pending: shoppingOrders.filter((order) => order.status === "PENDING").length,
    inTransit: shoppingOrders.filter((order) => order.status === "SHIPPED").length,
    completed: shoppingOrders.filter((order) => order.status === "DELIVERED").length,
    canceled: shoppingOrders.filter((order) => order.status === "CANCELED").length,
  };

  const recentOrders = shoppingOrders.slice(0, 8).map((order) => ({
    id: order.id,
    total: Number(order.total),
    status: order.status,
    createdAt: order.createdAt,
    itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
    paymentStatus: order.payment?.status || "INITIATED",
  }));

  return ok({
    profile: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdAt,
    },
    wallet: {
      balance: walletMetrics.balance,
      totalDeposited: walletMetrics.totalDeposited,
      pendingDeposits: walletMetrics.pendingDeposits,
      totalSpentFromWallet: walletMetrics.totalSpentFromWallet,
      depositsCount: walletTransactions.filter((txn) => txn.status === "SUCCESS").length,
      transactions: walletTransactions.slice(0, 10),
    },
    orders: {
      summary: orderSummary,
      totalSpent,
      recent: recentOrders,
    },
  });
}
