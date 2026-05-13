import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { orderCreateSchema } from "@/lib/validators";
import { ok, fail, unauthorized } from "@/lib/response";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { user, payload } = await getUserFromRequest(req);
  if (!user || !payload) return unauthorized();
  const where = payload.role === "ADMIN" ? {} : { userId: user.id };
  const orders = await prisma.order.findMany({
    where,
    include: { items: true, payment: true, user: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(orders);
}

export async function POST(req: NextRequest) {
  const { user, payload } = await getUserFromRequest(req);
  if (!user || !payload) return unauthorized();
  const json = await req.json().catch(() => null);
  const parsed = orderCreateSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const { items, deliveryInfo } = parsed.data;
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      total,
      deliveryInfo,
      items: {
        create: items.map((i) => ({ ...i })),
      },
      status: "PENDING",
    },
    include: { items: true },
  });
  return ok(order, 201);
}
