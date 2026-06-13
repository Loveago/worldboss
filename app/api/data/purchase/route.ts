import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { dataPurchaseSchema } from "@/lib/validators";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { getUserFromRequest, hashPassword } from "@/lib/auth";
import { getAgentBundleBasePrice, getAgentMarkup, getAgentProfile } from "@/lib/agents";

export async function POST(req: NextRequest) {
  const { user, payload } = await getUserFromRequest(req);
  const json = await req.json().catch(() => null);
  const parsed = dataPurchaseSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const { network, bundleId, phone, agentSlug } = parsed.data;
  const isGuestStorefrontCheckout = !user || !payload ? Boolean(agentSlug) : false;
  if (!user || !payload) {
    if (!isGuestStorefrontCheckout) return unauthorized();
  }
  const bundle = await prisma.dataBundle.findUnique({ where: { id: bundleId } });
  if (!bundle) return notFound("Bundle not found");
  if (bundle.network !== network) return fail("Bundle does not match network", 400);

  let agentMeta: { agentUserId?: string; agentSlug?: string; agentMarkup?: number; agentBasePrice?: number } = {};
  if (agentSlug) {
    const agentUser = await prisma.user.findFirst({
      where: {
        role: "USER",
        addresses: {
          path: ["agent", "storefrontSlug"],
          equals: agentSlug,
        },
      },
    });

    if (!agentUser) return fail("Agent storefront not found", 404);
    const profile = getAgentProfile(agentUser.addresses);
    if (!profile || profile.status !== "APPROVED") return fail("Agent storefront is not active", 400);

    const basePrice = getAgentBundleBasePrice(profile, bundle.id, Number(bundle.price));
    const markup = getAgentMarkup(profile, bundle.id);
    agentMeta = {
      agentUserId: agentUser.id,
      agentSlug,
      agentBasePrice: basePrice,
      agentMarkup: markup,
    };
  }

  let orderUserId = user?.id;
  if (!orderUserId) {
    const normalizedPhone = phone.replace(/\D/g, "");
    if (!normalizedPhone) return fail("Invalid phone number", 400);
    const guestEmail = `guest+${normalizedPhone}@korrelly.local`;
    const guest = await prisma.user.upsert({
      where: { email: guestEmail },
      update: { phone: phone.trim() },
      create: {
        email: guestEmail,
        passwordHash: await hashPassword(`guest-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        name: "Guest Checkout",
        phone: phone.trim(),
        role: "USER",
      },
    });
    orderUserId = guest.id;
  }

  const effectiveBasePrice = agentMeta.agentBasePrice ?? Number(bundle.price);
  const total = effectiveBasePrice + (agentMeta.agentMarkup || 0);
  const order = await prisma.order.create({
    data: {
      userId: orderUserId,
      total,
      status: "PENDING",
      items: { create: [] },
      deliveryInfo: {
        type: "DATA",
        network,
        bundleId,
        phone,
        basePrice: effectiveBasePrice,
        guestCheckout: Boolean(isGuestStorefrontCheckout),
        ...(agentMeta.agentUserId ? agentMeta : {}),
      },
    },
  });
  return ok({ orderId: order.id, reference: `DATA-${order.id}`, amount: total }, 201);
}
