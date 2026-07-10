import type { PrismaClient } from "@prisma/client";
import { submitDataOrderToEncart } from "./encart";
import { submitDataOrderToGrandTech } from "./grandtech";
import { getDataProvider } from "./settings";

/**
 * Submit a paid DATA order to the currently configured provider
 * (Encart or GrandTech). Existing provider references are preserved.
 */
export async function submitDataOrderToProvider(orderId: string, prisma: PrismaClient) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const deliveryInfo = ((order.deliveryInfo || {}) as Record<string, unknown>) || {};
  if (deliveryInfo.type !== "DATA") return;

  // Prefer whatever provider already owns this order.
  if (typeof deliveryInfo.encartReference === "string" && deliveryInfo.encartReference) {
    return submitDataOrderToEncart(orderId, prisma);
  }
  if (typeof deliveryInfo.grandtechReference === "string" && deliveryInfo.grandtechReference) {
    return submitDataOrderToGrandTech(orderId, prisma);
  }

  const markedProvider =
    typeof deliveryInfo.dataProvider === "string" ? deliveryInfo.dataProvider.toLowerCase() : "";
  if (markedProvider === "encart") {
    return submitDataOrderToEncart(orderId, prisma);
  }
  if (markedProvider === "grandtech") {
    return submitDataOrderToGrandTech(orderId, prisma);
  }

  const provider = await getDataProvider(prisma);
  if (provider === "grandtech") {
    return submitDataOrderToGrandTech(orderId, prisma);
  }
  return submitDataOrderToEncart(orderId, prisma);
}
