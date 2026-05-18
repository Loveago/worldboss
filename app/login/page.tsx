"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

type AuthResponse = {
  user: { id: string; email: string; role: "USER" | "ADMIN"; name?: string | null };
};

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      queryClient.setQueryData(["auth-profile"], response.user);
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      if (response.user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
      <section className="store-hero p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-16 left-6 h-28 w-28 rounded-full bg-emerald-100 blur-3xl opacity-70 store-glow" />
        <div className="absolute -bottom-24 right-10 h-36 w-36 rounded-full bg-amber-100 blur-3xl opacity-70 store-glow" />
        <div className="relative z-10 space-y-4">
          <span className="store-pill px-3 py-1 text-xs">Welcome back</span>
          <h1 className="font-sora text-2xl md:text-3xl text-slate-900">Sign in to Corelly</h1>
          <p className="text-sm text-slate-600">
            Keep your cart synced, track deliveries, and unlock concierge support.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "Saved carts", copy: "Pick up from any device." },
              { title: "Fast checkout", copy: "One tap to pay." },
              { title: "Order tracking", copy: "Live delivery updates." },
              { title: "Design concierge", copy: "Request custom kits." },
            ].map((item, index) => (
              <div
                key={item.title}
                className="store-card p-4 bg-white/80 space-y-1 store-fade-up"
                style={{ animationDelay: `${120 + index * 90}ms` }}
              >
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="text-xs text-slate-500">{item.copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="store-card p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="font-sora text-xl text-slate-900">Welcome back</h2>
          <p className="text-sm text-slate-500">Enter your details to continue.</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-[var(--store-border)] px-3 py-2 text-sm"
            placeholder="you@email.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-[var(--store-border)] px-3 py-2 text-sm"
            placeholder="••••••••"
          />
        </div>

        {error && <div className="store-card p-3 text-xs text-rose-600">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm w-full disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-xs text-slate-500 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[var(--store-accent)]">
            Create one
          </Link>
        </div>
      </form>
    </div>
  );
}
