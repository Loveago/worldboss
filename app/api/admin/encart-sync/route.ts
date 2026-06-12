import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { syncOutstandingDataOrders } from "@/lib/encart";
import { ok, unauthorized, fail } from "@/lib/response";

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET || "";
  const body = await req.json().catch(() => ({}));
  if (secret && body.secret !== secret) {
    return unauthorized();
  }

  const results = await syncOutstandingDataOrders(prisma);
  return ok({
    message: "Encart sync completed",
    checked: results.checked,
    updated: results.updated,
    failed: results.failed,
  });
}
