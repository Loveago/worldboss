import { cookies } from "next/headers";
import type { ApiResponse } from "@/types";
import { resolveApiUrl } from "./api-client";

export async function apiServerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const url = resolveApiUrl(path);
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });
  const data = (await res.json()) as ApiResponse<T>;
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
}
