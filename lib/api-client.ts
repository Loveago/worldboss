import type { ApiResponse } from "@/types";

export function resolveApiUrl(path: string) {
  if (path.startsWith("http")) return path;
  if (typeof window !== "undefined") return path;
  const baseEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (!baseEnv) return path;
  const base = baseEnv.startsWith("http") ? baseEnv : `https://${baseEnv}`;
  return `${base}${path}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveApiUrl(path);
  const res = await fetch(url, {
    credentials: "include",
    ...init,
  });
  const data = (await res.json()) as ApiResponse<T>;
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
}
