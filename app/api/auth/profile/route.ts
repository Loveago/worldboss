import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user) return unauthorized();
  return ok({ id: user.id, email: user.email, role: user.role, name: user.name });
}
