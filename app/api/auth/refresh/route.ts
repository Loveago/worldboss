import { NextRequest } from "next/server";
import { getUserFromRequest, signToken, setAuthCookie } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { user, payload } = await getUserFromRequest(req);
  if (!user || !payload) return unauthorized();
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  setAuthCookie(token);
  return ok({ token });
}
