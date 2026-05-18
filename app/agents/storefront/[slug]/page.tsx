"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type Bundle = {
  id: string;
  network: "mtn" | "telecel" | "airteltigo";
  name: string;
  volume: string;
  validity: string;
  price: number;
  markup: number;
};

type StorefrontPayload = {
  agent: {
    storefrontName: string;
    storefrontSlug: string;
    contactPhone: string;
    whatsappNumber: string;
  };
  bundles: Bundle[];
};

type PaystackInit = { authorization_url?: string; data?: { authorization_url?: string } | null };

const resolveAuthUrl = (init: PaystackInit | null) => init?.authorization_url || init?.data?.authorization_url || null;

export default function AgentStorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const [activeBundle, setActiveBundle] = useState<Bundle | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storefrontQuery = useQuery<StorefrontPayload>({
    queryKey: ["agent-storefront", slug],
    queryFn: () => apiFetch<StorefrontPayload>(`/api/agents/storefront/${slug}`),
    enabled: Boolean(slug),
  });

  const groupedBundles = useMemo(() => {
    const bundles = storefrontQuery.data?.bundles || [];
    return {
      mtn: bundles.filter((bundle) => bundle.network === "mtn"),
      telecel: bundles.filter((bundle) => bundle.network === "telecel"),
      airteltigo: bundles.filter((bundle) => bundle.network === "airteltigo"),
    };
  }, [storefrontQuery.data?.bundles]);

  const buyBundle = async () => {
    if (!activeBundle) return;
    if (!phone.trim()) {
      setError("Recipient phone is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const purchase = await apiFetch<{ orderId: string }>("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: activeBundle.network,
          bundleId: activeBundle.id,
          phone: phone.trim(),
          agentSlug: slug,
        }),
      });

      const init = await apiFetch<PaystackInit>("/api/payments/paystack/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: purchase.orderId, email: email.trim() }),
      });

      const url = resolveAuthUrl(init);
      if (!url) throw new Error("Unable to initialize payment");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete purchase");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {storefrontQuery.isLoading && <div className="store-card p-4 text-sm text-slate-500">Loading storefront...</div>}
      {storefrontQuery.isError && (
        <div className="store-card p-4 text-sm text-rose-600">{storefrontQuery.error instanceof Error ? storefrontQuery.error.message : "Storefront unavailable"}</div>
      )}

      {storefrontQuery.data && (
        <>
          <section className="store-hero p-6 space-y-2">
            <h1 className="font-sora text-3xl text-slate-900">{storefrontQuery.data.agent.storefrontName}</h1>
            <p className="text-sm text-slate-600">Buy data bundles directly from this Corelly agent storefront.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="store-outline px-3 py-1">Phone: {storefrontQuery.data.agent.contactPhone}</span>
              <span className="store-outline px-3 py-1">WhatsApp: {storefrontQuery.data.agent.whatsappNumber}</span>
            </div>
          </section>

          <section className="space-y-4">
            {(["mtn", "telecel", "airteltigo"] as const).map((network) => (
              <div key={network} className="space-y-2">
                <h2 className="font-sora text-lg text-slate-900 uppercase">{network}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {groupedBundles[network].map((bundle) => (
                    <button
                      key={bundle.id}
                      type="button"
                      onClick={() => setActiveBundle(bundle)}
                      className="store-card p-3 text-left hover:-translate-y-0.5 transition"
                    >
                      <div className="text-sm font-semibold text-slate-900">{bundle.volume}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{bundle.validity}</div>
                      <div className="text-base font-semibold text-emerald-600 mt-2">{formatCurrency(bundle.price)}</div>
                      {bundle.markup > 0 && <div className="text-[11px] text-slate-500">Agent markup included</div>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {activeBundle && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex items-center justify-center">
              <div className="store-card p-5 w-full max-w-md space-y-3">
                <h3 className="font-sora text-lg text-slate-900">Buy {activeBundle.volume}</h3>
                <div className="text-sm text-slate-600">Total: {formatCurrency(activeBundle.price)}</div>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className="w-full store-outline px-3 py-2 text-sm"
                />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Recipient phone"
                  className="w-full store-outline px-3 py-2 text-sm"
                />
                {error && <div className="text-xs text-rose-600">{error}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setActiveBundle(null)} className="store-outline px-3 py-2 text-sm">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={buyBundle}
                    disabled={submitting}
                    className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {submitting ? "Redirecting..." : "Pay now"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-500">
            Want your own storefront? <Link href="/agents" className="text-[var(--store-accent)]">Apply as an agent</Link>
          </div>
        </>
      )}
    </div>
  );
}
