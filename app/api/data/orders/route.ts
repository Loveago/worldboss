import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/response";
import { requireRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;

  const orders = await prisma.order.findMany({
    where: {
      deliveryInfo: {
        path: ["type"],
        equals: "DATA",
      },
    },
    include: { user: true, payment: true },
    orderBy: { createdAt: "desc" },
  });

  return ok(orders);
}
