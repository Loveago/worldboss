import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ok } from "@/lib/response";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;

  const orders = await prisma.order.findMany({
    where: {
      deliveryInfo: {
        path: ["type"],
        equals: "AGENT_WITHDRAWAL",
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const items = orders.map((order) => {
    const info = (order.deliveryInfo || {}) as Record<string, unknown>;
    return {
      id: order.id,
      amount: Number(order.total),
      status: order.payment?.status || "INITIATED",
      createdAt: order.createdAt,
      user: order.user,
      momoName: typeof info.momoName === "string" ? info.momoName : "",
      momoNumber: typeof info.momoNumber === "string" ? info.momoNumber : "",
      momoNetwork: typeof info.momoNetwork === "string" ? info.momoNetwork : "",
      netAmount: typeof info.netAmount === "number" ? info.netAmount : Number(order.total),
      fee: typeof info.fee === "number" ? info.fee : 1,
    };
  });

  return ok(items);
}
