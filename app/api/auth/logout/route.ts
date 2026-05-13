import { NextRequest } from "next/server";
import { ok } from "@/lib/response";
import { clearAuthCookie } from "@/lib/auth";

export async function POST(_: NextRequest) {
  clearAuthCookie();
  return ok({ loggedOut: true });
}
