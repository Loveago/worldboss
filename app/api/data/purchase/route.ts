import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { dataPurchaseSchema } from "@/lib/validators";
import { ok, fail, unauthorized, notFound } from "@/lib/response";
import { getUserFromRequest } from "@/lib/auth";
import { getAgentMarkup, getAgentProfile } from "@/lib/agents";

export async function POST(req: NextRequest) {
  const { user, payload } = await getUserFromRequest(req);
  if (!user || !payload) return unauthorized();
  const json = await req.json().catch(() => null);
  const parsed = dataPurchaseSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const { network, bundleId, phone, agentSlug } = parsed.data;
  const bundle = await prisma.dataBundle.findUnique({ where: { id: bundleId } });
  if (!bundle) return notFound("Bundle not found");
  if (bundle.network !== network) return fail("Bundle does not match network", 400);

  let agentMeta: { agentUserId?: string; agentSlug?: string; agentMarkup?: number } = {};
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

    const markup = getAgentMarkup(profile, bundle.id);
    agentMeta = {
      agentUserId: agentUser.id,
      agentSlug,
      agentMarkup: markup,
    };
  }

  const total = Number(bundle.price) + (agentMeta.agentMarkup || 0);
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      total,
      status: "PENDING",
      items: { create: [] },
      deliveryInfo: {
        type: "DATA",
        network,
        bundleId,
        phone,
        basePrice: Number(bundle.price),
        ...(agentMeta.agentUserId ? agentMeta : {}),
      },
    },
  });
  return ok({ orderId: order.id, reference: `DATA-${order.id}`, amount: total }, 201);
}
