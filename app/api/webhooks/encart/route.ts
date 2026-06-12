import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { applyEncartWebhookEvent, isValidEncartWebhookSignature } from "@/lib/encart";
import { fail, ok } from "@/lib/response";

export async function GET() {
  return ok({ status: "webhook endpoint reachable", hint: "POST Encart webhooks here" });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");

  // Very verbose logging so we never miss a webhook
  console.log("[encart-webhook-route] ===== INCOMING WEBHOOK =====");
  console.log("[encart-webhook-route] URL:", req.url);
  console.log("[encart-webhook-route] Method:", req.method);
  console.log("[encart-webhook-route] Content-Type:", req.headers.get("content-type"));
  console.log("[encart-webhook-route] Content-Length:", req.headers.get("content-length"));
  console.log("[encart-webhook-route] X-Webhook-Event:", req.headers.get("x-webhook-event"));
  console.log("[encart-webhook-route] X-Webhook-Source:", req.headers.get("x-webhook-source"));
  console.log("[encart-webhook-route] X-Webhook-Timestamp:", req.headers.get("x-webhook-timestamp"));
  console.log("[encart-webhook-route] X-Webhook-Signature:", signature?.slice(0, 60) || "(none)");
  console.log("[encart-webhook-route] Raw body (first 500 chars):", rawBody.slice(0, 500));

  if (!isValidEncartWebhookSignature(rawBody, signature, { warn: true })) {
    console.warn("[encart-webhook-route] Invalid signature — returning 401");
    return fail("Invalid Encart webhook signature", 401);
  }

  let event: {
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

  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    console.error("[encart-webhook-route] JSON parse failed:", e instanceof Error ? e.message : e);
    return fail("Invalid JSON body", 400);
  }

  console.log("[encart-webhook-route] Event:", event.event, "ref:", event.data?.reference, "status:", event.data?.status);

  try {
    await applyEncartWebhookEvent(event, prisma);
  } catch (e) {
    console.error("[encart-webhook-route] applyEncartWebhookEvent failed:", e instanceof Error ? e.message : e);
    // Return 200 anyway so Encart doesn't retry unnecessarily if the order state is borked
  }

  return ok({ received: true });
}
