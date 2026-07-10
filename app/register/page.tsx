"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

type AuthResponse = {
  user: { id: string; email: string; role: "USER" | "ADMIN"; name?: string | null };
};

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      const response = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim(),
          password,
        }),
      });
      queryClient.setQueryData(["auth-profile"], response.user);
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
      <section className="kb-cosmos-panel p-6 md:p-8">
        <div className="relative z-10 space-y-5">
          <span className="kb-chip bg-white/10 text-white border border-white/15">Join the club</span>
          <h1 className="font-sora text-2xl md:text-3xl text-white">Create your Korelly account</h1>
          <p className="text-sm text-white/70 max-w-lg">
            Save carts, unlock concierge support, and access members-only drops across gadgets, kits, and data.
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
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 space-y-1 store-fade-up"
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
          <h2 className="font-sora text-xl text-slate-900">Create your account</h2>
          <p className="text-sm text-slate-500">Set up your profile in under a minute.</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-500">Full name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="kb-input"
            placeholder="Ama Mensah"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-500">
            Phone <span className="text-rose-500">*</span>
          </label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="kb-input"
            placeholder="024 000 0000"
            required
          />
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

        <button
          type="submit"
          disabled={submitting || !name.trim() || !email.trim() || !phone.trim() || !password}
          className="store-btn-primary px-4 py-2.5 text-sm w-full disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <div className="text-xs text-slate-500 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--store-accent)] font-medium">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
