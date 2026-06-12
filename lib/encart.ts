import crypto from "crypto";
import type { Network, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

type JsonMap = Record<string, unknown>;

type EncartEvent = {
  event?: string;
  timestamp?: string;
  data?: {
    reference?: string;
    status?: string;
    provider_reference?: string;
    recipient?: string;
    volume_mb?: number;
    amount?: number;
  };
};

const ENCART_BASE_URL = process.env.ENCART_BASE_URL || "https://encartastores.com/api";
const ENCART_API_KEY = process.env.ENCART_API_KEY || "";
const ENCART_WEBHOOK_SECRET = process.env.ENCART_WEBHOOK_SECRET || "direct";
const ENCART_WEBHOOK_URL = process.env.ENCART_WEBHOOK_URL || "";

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function resolveNetworkKey(network: Network, segment?: string | null) {
  if (network === "mtn") return "YELLO";
  if (network === "telecel") return "TELECEL";
  if (network === "airteltigo") {
    if (segment?.toLowerCase().includes("bigtime")) return "AT_BIGTIME";
    return "AT_PREMIUM";
  }
  return "YELLO";
}

function normalizeRecipientPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("233")) return `0${digits.slice(3)}`;
  return digits;
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

function extractReference(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as JsonMap;

  // Check multiple possible field names for the purchase reference
  const candidates = [root.reference, root.id, root.orderId, root.purchaseId, root.provider_reference];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate) return candidate;
  }

  // Also check nested data object
  const data = root.data;
  if (data && typeof data === "object") {
    const dataObj = data as JsonMap;
    const dataCandidates = [dataObj.reference, dataObj.id, dataObj.orderId, dataObj.purchaseId, dataObj.provider_reference];
    for (const candidate of dataCandidates) {
      if (typeof candidate === "string" && candidate) return candidate;
    }
  }
  return null;
}

function extractProviderStatus(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as JsonMap;
  if (typeof root.status === "string") return root.status;
  const data = root.data;
  if (data && typeof data === "object" && typeof (data as JsonMap).status === "string") {
    return (data as JsonMap).status as string;
  }
  return null;
}

async function tryStatusEndpoints(encartReference: string): Promise<{ status: string; raw: unknown } | null> {
  const paths = [
    `/purchase/${encodeURIComponent(encartReference)}`,
    `/purchase/status/${encodeURIComponent(encartReference)}`,
    `/orders/${encodeURIComponent(encartReference)}`,
    `/transactions/${encodeURIComponent(encartReference)}`,
  ];

  for (const path of paths) {
    try {
      const body = await encartFetch(path);
      const status = extractProviderStatus(body) || "";
      if (status) {
        console.log("[encart] Status check succeeded via", path, "status:", status);
        return { status: status.toLowerCase(), raw: body };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("404")) {
        // Non-404 error — log and stop trying
        console.error("[encart] Status check failed for", path, "error:", msg);
        break;
      }
      // 404 — try next endpoint
      console.log("[encart] 404 on", path, "— trying next endpoint pattern");
    }
  }
  return null;
}

async function encartFetch(path: string, init?: RequestInit) {
  if (!ENCART_API_KEY) {
    throw new Error("ENCART_API_KEY is missing");
  }

  const url = `${ENCART_BASE_URL}${path}`;
  const isGet = !init?.method || init.method.toUpperCase() === "GET";

  const headers = new Headers(init?.headers);
  headers.set("X-API-Key", ENCART_API_KEY);
  // Don't send Content-Type on GET requests (no body) — some APIs reject this
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
    console.error("[encart] HTTP error:", response.status, url, "body:", body);
    const message =
      (body && typeof body === "object" && "message" in body && typeof (body as JsonMap).message === "string"
        ? ((body as JsonMap).message as string)
        : null) || `Encart request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

/**
 * Submit a data order to Encart.
 *
 * Status flow (dataStatus set independently from order.status):
 *   PENDING   → order placed, awaiting payment
 *   PLACED    → submitted to Encart, waiting for provider
 *   PROCESSING→ Encart webhook confirms provider is processing
 *   DELIVERED → Encart webhook confirms delivery
 *   FAILED    → Encart webhook confirms failure
 */
export async function submitDataOrderToEncart(orderId: string, prisma: PrismaClient) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const deliveryInfo = ((order.deliveryInfo || {}) as JsonMap) || {};
  if (deliveryInfo.type !== "DATA") return;
  if (order.dataStatus === "DELIVERED" || order.dataStatus === "FAILED") return;
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
          encartStatus: "submit_failed",
          encartLastError: "Unable to resolve bundle capacity",
          encartLastAttemptAt: new Date().toISOString(),
        },
      },
    });
    return;
  }

  const recipient = normalizeRecipientPhone(recipientRaw);
  const payload: JsonMap = {
    networkKey: resolveNetworkKey(bundle.network, bundle.segment),
    recipient,
    capacity,
  };

  if (ENCART_WEBHOOK_URL) {
    payload.webhook_url = ENCART_WEBHOOK_URL;
  }

  try {
    const providerResponse = await encartFetch("/purchase", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const encartReference = extractReference(providerResponse);
    const encartStatus = extractProviderStatus(providerResponse) || "queued";

    console.log("[encart] Order", order.id, "submitted. Extracted ref:", encartReference, "status:", encartStatus, "raw response:", JSON.stringify(providerResponse).slice(0, 500));

    const nextInfo: Prisma.InputJsonValue = {
      ...deliveryInfo,
      encartStatus,
      ...(encartReference ? { encartReference } : {}),
      encartSubmittedAt: new Date().toISOString(),
      encartRequest: asInputJson(payload),
      encartResponse: asInputJson(providerResponse),
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
          encartStatus: "submit_failed",
          encartLastError: error instanceof Error ? error.message : "Unknown provider error",
          encartLastAttemptAt: new Date().toISOString(),
          encartRequest: asInputJson(payload),
        } as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * Poll Encart for the current status of a single order by its provider reference.
 *
 * Expected endpoint: GET /purchase/{reference}
 * Expected response shape: { status: "queued" | "placed" | "processing" | "delivered" | "failed", ... }
 */
export async function checkEncartOrderStatus(encartReference: string) {
  const result = await tryStatusEndpoints(encartReference);
  if (!result) {
    console.error("[encart] All status endpoints failed for ref:", encartReference);
  }
  return result;
}

/**
 * Bulk-sync all outstanding data orders with Encart.
 * Queries every order with dataStatus PLACED or PROCESSING that has an encartReference,
 * polls Encart for the latest status, and updates the order.
 */
export async function syncOutstandingDataOrders(prisma: PrismaClient) {
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

  // Separate: orders already submitted to Encart (poll for status)
  const pollOrders = candidates.filter((o) => {
    const info = (o.deliveryInfo || {}) as JsonMap;
    return typeof info.encartReference === "string" && info.encartReference;
  });

  // Separate: paid orders that were never submitted to Encart (retry submission)
  const retryOrders = candidates.filter((o) => {
    const info = (o.deliveryInfo || {}) as JsonMap;
    return o.status === "PAID" && info.type === "DATA" && !info.encartReference;
  });

  console.log(`[encart] sync: ${pollOrders.length} to poll, ${retryOrders.length} to retry`);

  // Retry unpaid submissions first
  for (const order of retryOrders) {
    console.log("[encart] Retrying submission for order", order.id);
    try {
      await submitDataOrderToEncart(order.id, prisma);
    } catch (err) {
      console.error("[encart] Retry submission failed for order", order.id, "error:", err instanceof Error ? err.message : err);
    }
  }

  const results = { checked: 0, updated: 0, failed: 0 };

  for (const order of pollOrders) {
    const deliveryInfo = ((order.deliveryInfo || {}) as JsonMap) || {};
    const ref = typeof deliveryInfo.encartReference === "string" ? deliveryInfo.encartReference : "";
    if (!ref) continue;

    results.checked++;
    console.log("[encart] Checking order", order.id, "ref:", ref);
    const poll = await checkEncartOrderStatus(ref);
    if (!poll) {
      results.failed++;
      console.log("[encart] Poll failed for order", order.id, "ref:", ref);
      continue;
    }
    console.log("[encart] Poll success for order", order.id, "status:", poll.status);

    const s = poll.status;
    let nextDataStatus: "PLACED" | "PROCESSING" | "DELIVERED" | "FAILED" | null = null;
    if (s === "delivered") nextDataStatus = "DELIVERED";
    else if (s === "failed") nextDataStatus = "FAILED";
    else if (s === "processing") nextDataStatus = "PROCESSING";
    else if (s === "placed" || s === "queued") nextDataStatus = "PLACED";

    if (!nextDataStatus || nextDataStatus === order.dataStatus) continue;

    const nextInfo: JsonMap = {
      ...deliveryInfo,
      encartStatus: s,
      encartPolledAt: new Date().toISOString(),
      encartPollResponse: asInputJson(poll.raw),
    };

    if (nextDataStatus === "DELIVERED") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          dataStatus: "DELIVERED",
          deliveryInfo: { ...nextInfo, encartDeliveredAt: new Date().toISOString() },
        },
      });
    } else if (nextDataStatus === "FAILED") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          dataStatus: "FAILED",
          deliveryInfo: { ...nextInfo, encartFailedAt: new Date().toISOString() },
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

function computeWebhookSignature(rawBody: string) {
  return crypto.createHmac("sha256", ENCART_WEBHOOK_SECRET).update(rawBody).digest("hex");
}

export function isValidEncartWebhookSignature(rawBody: string, signature?: string | null, opts?: { warn?: boolean }) {
  if (!signature) {
    if (opts?.warn) console.warn("[encart] Missing webhook signature");
    return false;
  }
  const computed = computeWebhookSignature(rawBody);
  const expected = `sha256=${computed}`;
  const sig = signature.startsWith("sha256=") ? signature : `sha256=${signature}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(sig);
  if (expectedBuffer.length !== signatureBuffer.length) {
    if (opts?.warn) console.warn("[encart] Webhook signature length mismatch");
    return false;
  }
  const valid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  if (!valid && opts?.warn) {
    console.warn("[encart] Webhook signature mismatch. Expected:", expected, "Got:", sig);
  }
  return valid;
}

/**
 * Apply an Encart webhook event to a data order.
 *
 * Maps Encart events to dataStatus (not order.status):
 *   order.placed     → PLACED
 *   order.processing → PROCESSING
 *   order.delivered  → DELIVERED
 *   order.failed     → FAILED
 */
export async function applyEncartWebhookEvent(event: EncartEvent, prisma: PrismaClient) {
  const eventName = event.event || "";
  const reference = event.data?.reference || "";
  if (!eventName || !reference) {
    console.log("[encart-webhook] Ignored: missing eventName or reference", { eventName, reference });
    return;
  }

  // Look up by encartReference without relying on Prisma JSON path equality,
  // which can behave differently across DBs/versions.
  const candidates = await prisma.order.findMany({
    where: {
      dataStatus: { in: ["PLACED", "PROCESSING", "PENDING"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const order = candidates.find((o) => {
    const info = (o.deliveryInfo || {}) as JsonMap;
    return info.encartReference === reference;
  });

  if (!order) {
    console.warn("[encart-webhook] No matching order for reference:", reference, "event:", eventName);
    return;
  }

  console.log("[encart-webhook] Found order", order.id, "for reference", reference, "event:", eventName);

  const deliveryInfo = ((order.deliveryInfo || {}) as JsonMap) || {};
  if (deliveryInfo.type !== "DATA") {
    console.log("[encart-webhook] Order", order.id, "is not a DATA order, skipping.");
    return;
  }

  const eventStatus = event.data?.status || "";
  let nextDataStatus: "PLACED" | "PROCESSING" | "DELIVERED" | "FAILED" | null = null;
  if (eventStatus === "delivered" || eventName === "order.delivered") {
    nextDataStatus = "DELIVERED";
  } else if (eventStatus === "failed" || eventName === "order.failed") {
    nextDataStatus = "FAILED";
  } else if (eventStatus === "processing" || eventName === "order.processing") {
    nextDataStatus = "PROCESSING";
  } else if (eventStatus === "placed" || eventName === "order.placed") {
    nextDataStatus = "PLACED";
  }

  if (!nextDataStatus) {
    console.log("[encart-webhook] Unrecognized status/event for order", order.id, "— status:", eventStatus, "event:", eventName);
    return;
  }

  if (nextDataStatus === order.dataStatus) {
    console.log("[encart-webhook] Order", order.id, "already", order.dataStatus, "— no update needed.");
    return;
  }

  const nextInfo: JsonMap = {
    ...deliveryInfo,
    encartWebhookEvent: eventName,
    encartWebhookReceivedAt: new Date().toISOString(),
    encartProviderReference: event.data?.provider_reference || deliveryInfo.encartProviderReference,
    encartStatus: event.data?.status || deliveryInfo.encartStatus,
    encartLastWebhook: asInputJson(event),
  };

  if (nextDataStatus === "DELIVERED") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        dataStatus: "DELIVERED",
        deliveryInfo: {
          ...nextInfo,
          encartDeliveredAt: event.timestamp || new Date().toISOString(),
        },
      },
    });
    console.log("[encart-webhook] Order", order.id, "updated to DELIVERED");
    return;
  }

  if (nextDataStatus === "FAILED") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        dataStatus: "FAILED",
        deliveryInfo: {
          ...nextInfo,
          encartFailedAt: event.timestamp || new Date().toISOString(),
        },
      },
    });
    console.log("[encart-webhook] Order", order.id, "updated to FAILED");
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      dataStatus: nextDataStatus,
      deliveryInfo: nextInfo as Prisma.InputJsonValue,
    },
  });
  console.log("[encart-webhook] Order", order.id, "updated to", nextDataStatus);
}
