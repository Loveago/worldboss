import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { syncOutstandingGrandTechOrders } from "@/lib/grandtech";
import { ok, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET || "";
  const body = await req.json().catch(() => ({}));
  if (secret && body.secret !== secret) {
    return unauthorized();
  }

  const results = await syncOutstandingGrandTechOrders(prisma);
  return ok({
    message: "GrandTech sync completed",
    checked: results.checked,
    updated: results.updated,
    failed: results.failed,
  });
}
