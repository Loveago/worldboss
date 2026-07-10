import type { Network, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  getDataProvider,
  getGrandTechApiKey,
  getGrandTechBaseUrl,
  getGrandTechWebhookUrl,
} from "./settings";

type JsonMap = Record<string, unknown>;

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function resolveCapacityGb(volume: string) {
  const normalized = volume.trim().toLowerCase();
  const gbMatch = normalized.match(/(\d+(?:\.\d+)?)\s*gb/);
  if (gbMatch) return Number(gbMatch[1]);
  const mbMatch = normalized.match(/(\d+(?:\.\d+)?)\s*mb/);
  if (mbMatch) return Number((Number(mbMatch[1]) / 1000).toFixed(3));
  const bareNumber = Number.parseFloat(normalized);
  if (Number.isFinite(bareNumber) && bareNumber > 0) return bareNumber;
  return null;
}

function normalizeGrandTechPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  if (digits.length === 12 && digits.startsWith("233")) return digits;
  return digits;
}

function mapNetwork(network: Network): "MTN" | "TELECEL" | "AIRTELTIGO" {
  if (network === "telecel") return "TELECEL";
  if (network === "airteltigo") return "AIRTELTIGO";
  return "MTN";
}

function mapBundleType(segment?: string | null, validity?: string | null): "EXPIRING" | "NON_EXPIRING" {
  const haystack = `${segment || ""} ${validity || ""}`.toLowerCase();
  if (
    haystack.includes("non") ||
    haystack.includes("no-expiry") ||
    haystack.includes("no expiry") ||
    haystack.includes("non-expiring") ||
    haystack.includes("non expiring")
  ) {
    return "NON_EXPIRING";
  }
  return "EXPIRING";
}

function extractOrderId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as JsonMap;

  const candidates = [root.orderId, root.id, root.reference];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate) return candidate;
  }

  const payloadNode = root.payload;
  if (payloadNode && typeof payloadNode === "object") {
    const node = payloadNode as JsonMap;
    const nested = [node.orderId, node.id, node.reference];
    for (const candidate of nested) {
      if (typeof candidate === "string" && candidate) return candidate;
    }

    const orders = node.orders;
    if (Array.isArray(orders) && orders[0] && typeof orders[0] === "object") {
      const first = orders[0] as JsonMap;
      if (typeof first.id === "string" && first.id) return first.id;
      if (typeof first.orderId === "string" && first.orderId) return first.orderId;
    }
  }

  const data = root.data;
  if (data && typeof data === "object") {
    const dataObj = data as JsonMap;
    const nested = [dataObj.orderId, dataObj.id, dataObj.reference];
    for (const candidate of nested) {
      if (typeof candidate === "string" && candidate) return candidate;
    }
  }

  return null;
}

function extractProviderStatus(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as JsonMap;

  if (typeof root.status === "string") return root.status;

  const data = root.data;
  if (data && typeof data === "object" && typeof (data as JsonMap).status === "string") {
    return (data as JsonMap).status as string;
  }

  const payloadNode = root.payload;
  if (payloadNode && typeof payloadNode === "object") {
    const node = payloadNode as JsonMap;
    if (typeof node.status === "string") return node.status;
    const orders = node.orders;
    if (Array.isArray(orders) && orders[0] && typeof orders[0] === "object") {
      const first = orders[0] as JsonMap;
      if (typeof first.status === "string") return first.status;
    }
  }

  return null;
}

function mapGrandTechStatus(status: string | null | undefined): "PLACED" | "PROCESSING" | "DELIVERED" | "FAILED" | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "completed" || s === "delivered" || s === "success") return "DELIVERED";
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") return "FAILED";
  if (s === "processing" || s === "in_progress" || s === "in-progress") return "PROCESSING";
  if (s === "pending" || s === "queued" || s === "placed" || s === "created") return "PLACED";
  return null;
}

async function grandtechFetch(
  prisma: PrismaClient,
  path: string,
  init?: RequestInit
) {
  const [apiKey, baseUrl] = await Promise.all([
    getGrandTechApiKey(prisma),
    getGrandTechBaseUrl(prisma),
  ]);

  if (!apiKey) {
    throw new Error("GRANDTECH_API_KEY is missing");
  }

  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const isGet = !init?.method || init.method.toUpperCase() === "GET";

  const headers = new Headers(init?.headers);
  headers.set("X-API-Key", apiKey);
  if (!isGet) {
    headers.set("Content-Type", "application/json");
  } else {
    headers.delete("Content-Type");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("[grandtech] HTTP error:", response.status, url, "body:", body);
    const message =
      (body && typeof body === "object" && "error" in body && typeof (body as JsonMap).error === "string"
        ? ((body as JsonMap).error as string)
        : null) ||
      (body && typeof body === "object" && "message" in body && typeof (body as JsonMap).message === "string"
        ? ((body as JsonMap).message as string)
        : null) ||
      `GrandTech request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

/**
 * Submit a data order to GrandTech.
 *
 * Status flow (dataStatus set independently from order.status):
 *   PENDING   → order placed, awaiting payment
 *   PLACED    → submitted to GrandTech, waiting for provider
 *   PROCESSING→ GrandTech status/webhook confirms processing
 *   DELIVERED → GrandTech status/webhook confirms completion
 *   FAILED    → GrandTech status/webhook confirms failure
 */
export async function submitDataOrderToGrandTech(orderId: string, prisma: PrismaClient) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const deliveryInfo = ((order.deliveryInfo || {}) as JsonMap) || {};
  if (deliveryInfo.type !== "DATA") return;
  if (order.dataStatus === "DELIVERED" || order.dataStatus === "FAILED") return;
  if (typeof deliveryInfo.grandtechReference === "string" && deliveryInfo.grandtechReference) return;
  // Already submitted to another provider
  if (typeof deliveryInfo.encartReference === "string" && deliveryInfo.encartReference) return;

  const bundleId = typeof deliveryInfo.bundleId === "string" ? deliveryInfo.bundleId : "";
  const recipientRaw = typeof deliveryInfo.phone === "string" ? deliveryInfo.phone : "";
  if (!bundleId || !recipientRaw) return;

  const bundle = await prisma.dataBundle.findUnique({ where: { id: bundleId } });
  if (!bundle) return;

  const capacity = resolveCapacityGb(bundle.volume);
  if (!capacity || capacity <= 0) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryInfo: {
          ...deliveryInfo,
          dataProvider: "grandtech",
          grandtechStatus: "submit_failed",
          grandtechLastError: "Unable to resolve bundle capacity",
          grandtechLastAttemptAt: new Date().toISOString(),
        },
      },
    });
    return;
  }

  const phone = normalizeGrandTechPhone(recipientRaw);
  const network = mapNetwork(bundle.network);
  const type = mapBundleType(bundle.segment, bundle.validity);
  const webhookUrl = await getGrandTechWebhookUrl(prisma);

  const packagePayload: JsonMap = {
    packageId: bundle.id,
    size: capacity,
    network,
    type,
    phone,
  };

  if (webhookUrl) {
    packagePayload.callback = webhookUrl;
  }

  const payload = {
    packages: [packagePayload],
  };

  try {
    const providerResponse = await grandtechFetch(prisma, "/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const grandtechReference = extractOrderId(providerResponse);
    const grandtechStatus = extractProviderStatus(providerResponse) || "processing";

    console.log(
      "[grandtech] Order",
      order.id,
      "submitted. Extracted ref:",
      grandtechReference,
      "status:",
      grandtechStatus,
      "raw response:",
      JSON.stringify(providerResponse).slice(0, 500)
    );

    const nextInfo: Prisma.InputJsonValue = {
      ...deliveryInfo,
      dataProvider: "grandtech",
      grandtechStatus,
      ...(grandtechReference ? { grandtechReference } : {}),
      grandtechSubmittedAt: new Date().toISOString(),
      grandtechRequest: asInputJson(payload),
      grandtechResponse: asInputJson(providerResponse),
    };

    await prisma.order.update({
      where: { id: order.id },
      data: {
        dataStatus: "PLACED",
        deliveryInfo: nextInfo,
      },
    });
  } catch (error) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryInfo: {
          ...deliveryInfo,
          dataProvider: "grandtech",
          grandtechStatus: "submit_failed",
          grandtechLastError: error instanceof Error ? error.message : "Unknown provider error",
          grandtechLastAttemptAt: new Date().toISOString(),
          grandtechRequest: asInputJson(payload),
        } as Prisma.InputJsonValue,
      },
    });
  }
}

export async function checkGrandTechOrderStatus(orderReference: string, prisma: PrismaClient) {
  try {
    const body = await grandtechFetch(prisma, `/api/orders/${encodeURIComponent(orderReference)}`);
    const status = extractProviderStatus(body) || "";
    if (!status) {
      console.error("[grandtech] Status response missing status for ref:", orderReference, body);
      return null;
    }
    return { status: status.toLowerCase(), raw: body };
  } catch (err) {
    console.error(
      "[grandtech] Status check failed for ref:",
      orderReference,
      "error:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Bulk-sync all outstanding GrandTech data orders.
 */
export async function syncOutstandingGrandTechOrders(prisma: PrismaClient) {
  const candidates = await prisma.order.findMany({
    where: {
      OR: [
        { dataStatus: { in: ["PLACED", "PROCESSING"] } },
        { dataStatus: null },
        { dataStatus: "PENDING" },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const activeProvider = await getDataProvider(prisma);

  const pollOrders = candidates.filter((o) => {
    const info = (o.deliveryInfo || {}) as JsonMap;
    return typeof info.grandtechReference === "string" && info.grandtechReference;
  });

  const retryOrders = candidates.filter((o) => {
    const info = (o.deliveryInfo || {}) as JsonMap;
    const marked = typeof info.dataProvider === "string" ? info.dataProvider.toLowerCase() : "";
    const shouldUseGrandtech = marked === "grandtech" || (!marked && activeProvider === "grandtech");
    return (
      o.status === "PAID" &&
      info.type === "DATA" &&
      !info.grandtechReference &&
      !info.encartReference &&
      shouldUseGrandtech
    );
  });

  console.log(`[grandtech] sync: ${pollOrders.length} to poll, ${retryOrders.length} to retry`);

  for (const order of retryOrders) {
    console.log("[grandtech] Retrying submission for order", order.id);
    try {
      await submitDataOrderToGrandTech(order.id, prisma);
    } catch (err) {
      console.error(
        "[grandtech] Retry submission failed for order",
        order.id,
        "error:",
        err instanceof Error ? err.message : err
      );
    }
  }

  const results = { checked: 0, updated: 0, failed: 0 };

  for (const order of pollOrders) {
    const deliveryInfo = ((order.deliveryInfo || {}) as JsonMap) || {};
    const ref = typeof deliveryInfo.grandtechReference === "string" ? deliveryInfo.grandtechReference : "";
    if (!ref) continue;

    results.checked++;
    console.log("[grandtech] Checking order", order.id, "ref:", ref);
    const poll = await checkGrandTechOrderStatus(ref, prisma);
    if (!poll) {
      results.failed++;
      console.log("[grandtech] Poll failed for order", order.id, "ref:", ref);
      continue;
    }
    console.log("[grandtech] Poll success for order", order.id, "status:", poll.status);

    const nextDataStatus = mapGrandTechStatus(poll.status);
    if (!nextDataStatus || nextDataStatus === order.dataStatus) continue;

    const nextInfo: JsonMap = {
      ...deliveryInfo,
      dataProvider: "grandtech",
      grandtechStatus: poll.status,
      grandtechPolledAt: new Date().toISOString(),
      grandtechPollResponse: asInputJson(poll.raw),
    };

    if (nextDataStatus === "DELIVERED") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          dataStatus: "DELIVERED",
          deliveryInfo: { ...nextInfo, grandtechDeliveredAt: new Date().toISOString() },
        },
      });
    } else if (nextDataStatus === "FAILED") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          dataStatus: "FAILED",
          deliveryInfo: { ...nextInfo, grandtechFailedAt: new Date().toISOString() },
        },
      });
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          dataStatus: nextDataStatus,
          deliveryInfo: nextInfo as Prisma.InputJsonValue,
        },
      });
    }
    results.updated++;
  }

  return results;
}

/**
 * Apply a GrandTech webhook/callback payload to a data order.
 *
 * Expected shapes vary; we accept:
 * - { id/orderId, status, ... }
 * - { data: { id/orderId, status, ... } }
 * - { payload: { orderId, orders: [{ id, status }] } }
 */
export async function applyGrandTechWebhookEvent(event: unknown, prisma: PrismaClient) {
  if (!event || typeof event !== "object") {
    console.log("[grandtech-webhook] Ignored: non-object payload");
    return;
  }

  const root = event as JsonMap;
  const reference =
    extractOrderId(event) ||
    (typeof root.orderId === "string" ? root.orderId : null) ||
    (typeof root.id === "string" ? root.id : null);

  const statusRaw =
    extractProviderStatus(event) ||
    (typeof root.status === "string" ? root.status : null);

  if (!reference) {
    console.log("[grandtech-webhook] Ignored: missing reference", event);
    return;
  }

  const candidates = await prisma.order.findMany({
    where: {
      dataStatus: { in: ["PLACED", "PROCESSING", "PENDING"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const order = candidates.find((o) => {
    const info = (o.deliveryInfo || {}) as JsonMap;
    return info.grandtechReference === reference;
  });

  if (!order) {
    console.warn("[grandtech-webhook] No matching order for reference:", reference);
    return;
  }

  console.log("[grandtech-webhook] Found order", order.id, "for reference", reference, "status:", statusRaw);

  const deliveryInfo = ((order.deliveryInfo || {}) as JsonMap) || {};
  if (deliveryInfo.type !== "DATA") {
    console.log("[grandtech-webhook] Order", order.id, "is not a DATA order, skipping.");
    return;
  }

  const nextDataStatus = mapGrandTechStatus(statusRaw);
  if (!nextDataStatus) {
    console.log("[grandtech-webhook] Unrecognized status for order", order.id, "— status:", statusRaw);
    return;
  }

  if (nextDataStatus === order.dataStatus) {
    console.log("[grandtech-webhook] Order", order.id, "already", order.dataStatus, "— no update needed.");
    return;
  }

  const nextInfo: JsonMap = {
    ...deliveryInfo,
    dataProvider: "grandtech",
    grandtechWebhookReceivedAt: new Date().toISOString(),
    grandtechStatus: statusRaw || deliveryInfo.grandtechStatus,
    grandtechLastWebhook: asInputJson(event),
  };

  if (nextDataStatus === "DELIVERED") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        dataStatus: "DELIVERED",
        deliveryInfo: {
          ...nextInfo,
          grandtechDeliveredAt: new Date().toISOString(),
        },
      },
    });
    console.log("[grandtech-webhook] Order", order.id, "updated to DELIVERED");
    return;
  }

  if (nextDataStatus === "FAILED") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        dataStatus: "FAILED",
        deliveryInfo: {
          ...nextInfo,
          grandtechFailedAt: new Date().toISOString(),
        },
      },
    });
    console.log("[grandtech-webhook] Order", order.id, "updated to FAILED");
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      dataStatus: nextDataStatus,
      deliveryInfo: nextInfo as Prisma.InputJsonValue,
    },
  });
  console.log("[grandtech-webhook] Order", order.id, "updated to", nextDataStatus);
}
