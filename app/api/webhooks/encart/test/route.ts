import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { applyEncartWebhookEvent } from "@/lib/encart";
import { ok, fail } from "@/lib/response";

/**
 * Test endpoint to manually simulate an Encart webhook.
 * No signature validation — for admin debugging only.
 *
 * POST body example:
 * {
 *   "event": "order.delivered",
 *   "timestamp": "2026-06-12T12:00:00Z",
 *   "data": {
 *     "reference": "API_20260612_xxxx",
 *     "status": "delivered"
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.event || !body.data?.reference) {
    return fail("Missing event or data.reference", 400);
  }

  console.log("[encart-webhook-test] Simulating event:", body.event, "ref:", body.data.reference, "status:", body.data.status);

  try {
    await applyEncartWebhookEvent(body, prisma);
    return ok({ received: true, simulated: true });
  } catch (e) {
    console.error("[encart-webhook-test] Failed:", e instanceof Error ? e.message : e);
    return fail(e instanceof Error ? e.message : "Webhook processing failed", 500);
  }
}
