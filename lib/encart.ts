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
  if (typeof root.reference === "string") return root.reference;
  const data = root.data;
  if (data && typeof data === "object" && typeof (data as JsonMap).reference === "string") {
    return (data as JsonMap).reference as string;
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

async function encartFetch(path: string, init?: RequestInit) {
  if (!ENCART_API_KEY) {
    throw new Error("ENCART_API_KEY is missing");
  }

  const response = await fetch(`${ENCART_BASE_URL}${path}`, {
    ...init,
    headers: {
      "X-API-Key": ENCART_API_KEY,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (body && typeof body === "object" && "message" in body && typeof (body as JsonMap).message === "string"
        ? ((body as JsonMap).message as string)
        : null) || `Encart purchase request failed with status ${response.status}`;
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

export function isValidEncartWebhookSignature(rawBody: string, signature?: string | null) {
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", ENCART_WEBHOOK_SECRET).update(rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
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
  if (!eventName || !reference) return;

  const order = await prisma.order.findFirst({
    where: {
      deliveryInfo: {
        path: ["encartReference"],
        equals: reference,
      },
    },
  });

  if (!order) return;

  const deliveryInfo = ((order.deliveryInfo || {}) as JsonMap) || {};
  if (deliveryInfo.type !== "DATA") return;

  const eventStatus = event.data?.status || "";
  // Determine next dataStatus from the Encart provider status
  let nextDataStatus: "PLACED" | "PROCESSING" | "DELIVERED" | "FAILED" | null = null;
  if (
    eventStatus === "delivered" ||
    eventName === "order.delivered"
  ) {
    nextDataStatus = "DELIVERED";
  } else if (
    eventStatus === "failed" ||
    eventName === "order.failed"
  ) {
    nextDataStatus = "FAILED";
  } else if (
    eventStatus === "processing" ||
    eventName === "order.processing"
  ) {
    nextDataStatus = "PROCESSING";
  } else if (
    eventStatus === "placed" ||
    eventName === "order.placed"
  ) {
    nextDataStatus = "PLACED";
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
    return;
  }

  if (nextDataStatus) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        dataStatus: nextDataStatus,
        deliveryInfo: nextInfo as Prisma.InputJsonValue,
      },
    });
  }
}
