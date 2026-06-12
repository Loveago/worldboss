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

  console.log("[encart-webhook-route] Received POST. Signature header:", signature?.slice(0, 30) || "(none)");

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
