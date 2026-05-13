"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

type AuthResponse = {
  user: { id: string; email: string; role: "USER" | "ADMIN"; name?: string | null };
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim(),
          password,
        }),
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
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
          <span className="store-pill px-3 py-1 text-xs">Join the club</span>
          <h1 className="font-sora text-2xl md:text-3xl text-slate-900">Create your Boss Market account</h1>
          <p className="text-sm text-slate-600">
            Save carts, unlock concierge support, and access members-only drops.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "Concierge chat", copy: "Get custom sourcing fast." },
              { title: "Exclusive drops", copy: "Limited kits and bundles." },
              { title: "Saved favorites", copy: "Keep a running wishlist." },
              { title: "Order updates", copy: "Stay on top of deliveries." },
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
          <h2 className="font-sora text-xl text-slate-900">Create your account</h2>
          <p className="text-sm text-slate-500">Set up your profile in under a minute.</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-500">Full name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-[var(--store-border)] px-3 py-2 text-sm"
            placeholder="Ama Mensah"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-500">Phone (optional)</label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-2xl border border-[var(--store-border)] px-3 py-2 text-sm"
            placeholder="024 000 0000"
          />
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
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <div className="text-xs text-slate-500 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--store-accent)]">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
