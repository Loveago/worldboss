import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAgentBundleBasePrice, getAgentMarkup, getAgentProfile } from "@/lib/agents";
import { fail, ok } from "@/lib/response";

export async function GET(_: NextRequest, { params }: { params: { slug: string } }) {
  const agent = await prisma.user.findFirst({
    where: {
      role: "USER",
      addresses: {
        path: ["agent", "storefrontSlug"],
        equals: params.slug,
      },
    },
    select: {
      id: true,
      name: true,
      addresses: true,
    },
  });

  if (!agent) return fail("Storefront not found", 404);

  const profile = getAgentProfile(agent.addresses);
  if (!profile || profile.status !== "APPROVED") return fail("Storefront unavailable", 404);

  const bundles = await prisma.dataBundle.findMany({
    orderBy: [{ network: "asc" }, { price: "asc" }],
  });

  const displayBundles = bundles.map((bundle) => {
    const basePrice = getAgentBundleBasePrice(profile, bundle.id, Number(bundle.price));
    const markup = getAgentMarkup(profile, bundle.id);
    return {
      ...bundle,
      basePrice,
      markup,
      price: basePrice + markup,
    };
  });

  return ok({
    agent: {
      storefrontName: profile.storefrontName,
      storefrontSlug: profile.storefrontSlug,
      contactPhone: profile.contactPhone,
      whatsappNumber: profile.whatsappNumber,
    },
    bundles: displayBundles,
  });
}
