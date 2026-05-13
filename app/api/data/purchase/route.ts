import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { dataPurchaseSchema } from "@/lib/validators";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { user, payload } = await getUserFromRequest(req);
  if (!user || !payload) return unauthorized();
  const json = await req.json().catch(() => null);
  const parsed = dataPurchaseSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const { network, bundleId, phone } = parsed.data;
  const bundle = await prisma.dataBundle.findUnique({ where: { id: bundleId } });
  if (!bundle) return notFound("Bundle not found");
  if (bundle.network !== network) return fail("Bundle does not match network", 400);
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      total: bundle.price,
      status: "PENDING",
      items: { create: [] },
      deliveryInfo: { type: "DATA", network, bundleId, phone },
    },
  });
  return ok({ orderId: order.id, reference: `DATA-${order.id}`, amount: bundle.price }, 201);
}
