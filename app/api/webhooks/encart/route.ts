import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { applyEncartWebhookEvent, isValidEncartWebhookSignature } from "@/lib/encart";
import { fail, ok } from "@/lib/response";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");

  if (!isValidEncartWebhookSignature(rawBody, signature, { warn: true })) {
    console.warn("[encart-webhook-route] Invalid signature — returning 401");
    return fail("Invalid Encart webhook signature", 401);
  }

  const event = JSON.parse(rawBody) as {
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

  console.log("[encart-webhook-route] Event:", event.event, "ref:", event.data?.reference, "status:", event.data?.status);

  await applyEncartWebhookEvent(event, prisma);

  return ok({ received: true });
}
