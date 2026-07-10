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
      <section className="kb-cosmos-panel p-6 md:p-8">
        <div className="relative z-10 space-y-5">
          <span className="kb-chip bg-white/10 text-white border border-white/15">Welcome back</span>
          <h1 className="font-sora text-2xl md:text-3xl text-white">Sign in to Korelly</h1>
          <p className="text-sm text-white/70 max-w-lg">
            Keep your cart synced, track deliveries, and unlock concierge support across gadgets, kits, and data.
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
                className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 space-y-1 store-fade-up"
                style={{ animationDelay: `${120 + index * 90}ms` }}
              >
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="text-xs text-white/60">{item.copy}</div>
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
            className="kb-input"
            placeholder="you@email.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="kb-input"
            placeholder="••••••••"
          />
        </div>

        {error && <div className="store-card p-3 text-xs text-rose-600 border border-rose-200 bg-rose-50">{error}</div>}

        <button type="submit" disabled={submitting} className="store-btn-primary px-4 py-2.5 text-sm w-full disabled:opacity-60">
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-xs text-slate-500 text-center">
          Don't have an account?{" "}
          <Link href="/register" className="text-[var(--store-accent)] font-medium">
            Create one
          </Link>
        </div>
      </form>
    </div>
  );
}
