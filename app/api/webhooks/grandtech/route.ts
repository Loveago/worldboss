import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { applyGrandTechWebhookEvent } from "@/lib/grandtech";
import { fail, ok } from "@/lib/response";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  console.log("[grandtech-webhook-route] ===== INCOMING WEBHOOK =====");
  console.log("[grandtech-webhook-route] URL:", req.url);
  console.log("[grandtech-webhook-route] Method:", req.method);
  console.log("[grandtech-webhook-route] Content-Type:", req.headers.get("content-type"));
  console.log("[grandtech-webhook-route] Raw body (first 500 chars):", rawBody.slice(0, 500));

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    console.error("[grandtech-webhook-route] JSON parse failed:", e instanceof Error ? e.message : e);
    return fail("Invalid JSON body", 400);
  }

  try {
    await applyGrandTechWebhookEvent(event, prisma);
  } catch (e) {
    console.error(
      "[grandtech-webhook-route] applyGrandTechWebhookEvent failed:",
      e instanceof Error ? e.message : e
    );
    // Return 200 so provider doesn't spam retries on local state issues.
  }

  return ok({ received: true });
}
