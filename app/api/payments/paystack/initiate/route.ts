import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { paystack } from "@/lib/paystack";
import { ok, fail } from "@/lib/response";
import { getUserFromRequest } from "@/lib/auth";

function resolveCallbackUrl(orderId: string, req: NextRequest) {
  const explicitBase = process.env.PAYSTACK_CALLBACK_BASE_URL;
  const normalizeBase = (value: string) => (value.startsWith("http") ? value : `https://${value}`);
  const base = explicitBase ? normalizeBase(explicitBase) : req.nextUrl.origin;
  return `${base}/payments/callback?orderId=${orderId}`;
}

export async function POST(req: NextRequest) {
  const { user, payload } = await getUserFromRequest(req);
  const body = await req.json().catch(() => null);
  const { orderId, email } = body || {};
  if (!orderId || !email) return fail("orderId and email are required", 400);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return fail("Order not found", 404);
  const deliveryInfo = (order.deliveryInfo || {}) as Record<string, unknown>;
  const storefrontSlug = typeof deliveryInfo.agentSlug === "string" ? deliveryInfo.agentSlug : undefined;
  const isGuestStorefrontDataOrder =
    deliveryInfo.type === "DATA" && typeof deliveryInfo.agentSlug === "string" && Boolean(deliveryInfo.agentSlug);

  if (!user || !payload) {
    if (!isGuestStorefrontDataOrder) return fail("Unauthorized", 401);
  } else if (payload.role !== "ADMIN" && order.userId !== user.id) {
    return fail("Unauthorized", 401);
  }

  const amountKobo = Math.round(Number(order.total) * 100);
  const callbackUrl = resolveCallbackUrl(order.id, req);
  const init = await paystack.transaction.initialize({
    amount: amountKobo.toString(),
    email,
    currency: "GHS",
    reference: `BM-${order.id}-${Date.now()}`,
    callback_url: callbackUrl,
    metadata: {
      orderId: order.id,
      userId: user?.id || order.userId,
      guestCheckout: isGuestStorefrontDataOrder,
      ...(storefrontSlug ? { agentSlug: storefrontSlug } : {}),
    },
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
