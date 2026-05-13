import { NextRequest } from "next/server";
import { designRequestSchema } from "@/lib/validators";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/response";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = designRequestSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());
  const created = await prisma.designRequest.create({ data: parsed.data });
  return ok(created, 201);
}
