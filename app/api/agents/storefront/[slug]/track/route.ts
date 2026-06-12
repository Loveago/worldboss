import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAgentProfile } from "@/lib/agents";
import { ok, fail } from "@/lib/response";

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") || "";
  const slug = params.slug;

  if (!phone.trim()) {
    return fail("Phone number is required", 400);
  }

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 9) {
    return fail("Invalid phone number", 400);
  }

  // Verify agent exists
  const agent = await prisma.user.findFirst({
    where: {
      role: "USER",
      addresses: {
        path: ["agent", "storefrontSlug"],
        equals: slug,
      },
    },
    select: { id: true, addresses: true },
  });

  if (!agent) return fail("Storefront not found", 404);

  const profile = getAgentProfile(agent.addresses);
  if (!profile || profile.status !== "APPROVED") return fail("Storefront unavailable", 404);

  // Find recent data orders and filter in JS to avoid Prisma JSON path quirks
  const candidates = await prisma.order.findMany({
    include: { payment: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const orders = candidates.filter((o) => {
    const info = (o.deliveryInfo || {}) as Record<string, unknown>;
    return (
      info.type === "DATA" &&
      info.agentSlug === slug &&
      info.phone === phone.trim()
    );
  });

  // Also try normalized phone variants
  const phoneVariants = [phone.trim(), normalizedPhone, `0${normalizedPhone}`, `+233${normalizedPhone}`];
  const uniquePhones = Array.from(new Set(phoneVariants));

  const bundleIds = orders
    .map((o) => (o.deliveryInfo as Record<string, unknown>)?.bundleId as string | undefined)
    .filter(Boolean) as string[];

  const bundles = bundleIds.length
    ? await prisma.dataBundle.findMany({
        where: { id: { in: bundleIds } },
        select: { id: true, name: true, volume: true, network: true },
      })
    : [];

  const bundleMap = new Map(bundles.map((b) => [b.id, b]));

  const enriched = orders.map((order) => {
    const info = (order.deliveryInfo || {}) as Record<string, unknown>;
    const bundle = bundleMap.get(info.bundleId as string);
    return {
      id: order.id,
      total: Number(order.total),
      status: order.status,
      dataStatus: order.dataStatus,
      createdAt: order.createdAt,
      deliveryInfo: {
        network: info.network || null,
        bundleId: info.bundleId || null,
        phone: info.phone || null,
        bundleName: bundle?.name || null,
        bundleVolume: bundle?.volume || null,
        bundleNetwork: bundle?.network || null,
      },
      payment: order.payment
        ? {
            reference: order.payment.reference,
            status: order.payment.status,
          }
        : null,
    };
  });

  return ok(enriched);
}
