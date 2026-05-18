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
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const buildSyntheticEmail = (value: string) => {
  const normalized = value.replace(/\D/g, "");
  if (!normalized) return "";
  return `storefront+${normalized}@corelly.local`;
};

const networkMeta: Record<Bundle["network"], { label: string; short: string; color: string }> = {
  mtn: { label: "MTN", short: "MTN", color: "bg-yellow-400 text-yellow-950" },
  telecel: { label: "Telecel", short: "T", color: "bg-rose-500 text-white" },
  airteltigo: { label: "AT", short: "AT", color: "bg-indigo-100 text-indigo-700" },
};

export default function AgentStorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const [activeBundle, setActiveBundle] = useState<Bundle | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Bundle["network"]>("mtn");
  const [confirmationMethod, setConfirmationMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [confirmationPhone, setConfirmationPhone] = useState("");
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

    const checkoutEmail =
      confirmationMethod === "email" ? email.trim() : buildSyntheticEmail(confirmationPhone.trim() || phone.trim());

    if (confirmationMethod === "email" && !isValidEmail(checkoutEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (confirmationMethod === "phone" && !confirmationPhone.trim()) {
      setError("Confirmation phone is required.");
      return;
    }

    if (!checkoutEmail) {
      setError("Unable to build a valid checkout email.");
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
        body: JSON.stringify({ orderId: purchase.orderId, email: checkoutEmail }),
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
    <div className="min-h-screen bg-slate-100 pb-8">
      {storefrontQuery.isLoading && <div className="store-card p-4 text-sm text-slate-500 m-4">Loading storefront...</div>}
      {storefrontQuery.isError && (
        <div className="store-card p-4 text-sm text-rose-600 m-4">{storefrontQuery.error instanceof Error ? storefrontQuery.error.message : "Storefront unavailable"}</div>
      )}

      {storefrontQuery.data && (
        <>
          <section className="storefront-hero text-white px-4 py-10 text-center space-y-3 store-fade-up">
            <div className="w-14 h-14 mx-auto rounded-2xl border border-white/35 bg-white/15 backdrop-blur flex items-center justify-center text-2xl store-float">
              🛍️
            </div>
            <h1 className="font-sora text-3xl md:text-4xl font-semibold">{storefrontQuery.data.agent.storefrontName}</h1>
            <p className="text-sm text-blue-100">Affordable data bundles · fast checkout · instant confirmation</p>
            <div className="flex items-center justify-center">
              <a
                href={`tel:${storefrontQuery.data.agent.contactPhone}`}
                className="rounded-full border border-white/40 bg-white/10 px-5 py-2 text-sm font-medium shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
              >
                📞 {storefrontQuery.data.agent.contactPhone}
              </a>
            </div>
          </section>

          <div className="bg-[#0f1c34] text-slate-100 px-4 py-3 flex gap-5 text-sm font-semibold overflow-x-auto no-scrollbar">
            <button type="button" className="opacity-100 border-b-2 border-white pb-1">📶 DATA</button>
            <button type="button" className="opacity-70 pb-1">🎟️ VOUCHERS</button>
            <button type="button" className="opacity-70 pb-1">🔎 TRACK</button>
          </div>

          <div className="px-3 md:px-4 pt-5 space-y-4">
            <div className="text-[11px] tracking-wide font-semibold text-slate-500">CHOOSE NETWORK</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {(["mtn", "telecel", "airteltigo"] as const).map((network) => {
                const active = selectedNetwork === network;
                const meta = networkMeta[network];
                return (
                  <button
                    key={network}
                    type="button"
                    onClick={() => setSelectedNetwork(network)}
                    className={`min-w-[96px] rounded-xl border px-3 py-2 text-center transition store-fade-up ${
                      active
                        ? "bg-white border-blue-500 shadow-[0_10px_24px_rgba(37,99,235,0.18)]"
                        : "bg-white/85 border-slate-300"
                    }`}
                  >
                    <div className={`w-9 h-9 mx-auto rounded-lg text-xs font-bold flex items-center justify-center ${meta.color}`}>{meta.short}</div>
                    <div className="text-[11px] font-semibold text-slate-700 mt-1">{meta.label}</div>
                  </button>
                );
              })}
            </div>

            <section className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {groupedBundles[selectedNetwork].map((bundle, index) => (
                  <div
                    key={bundle.id}
                    className="relative store-film-card is-visible"
                    style={{ "--film-delay": `${Math.min(index * 55, 330)}ms` } as React.CSSProperties}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveBundle(bundle)}
                      className="w-full overflow-hidden rounded-2xl border border-yellow-500/70 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.08)] hover:-translate-y-1 transition-transform"
                    >
                      <div className="h-20 bg-[#facc15] flex items-center justify-center">
                        <div className="rounded-full border-4 border-black px-6 py-1 text-2xl font-black tracking-tight text-black">
                          {networkMeta[bundle.network].short}
                        </div>
                      </div>
                      <div className="p-3 text-center space-y-1">
                        <div className="text-xl font-extrabold text-slate-800">{bundle.volume}</div>
                        <div className="text-[11px] font-medium text-slate-500 uppercase">{bundle.validity}</div>
                        <div className="text-[22px] leading-none font-black text-emerald-600">{formatCurrency(bundle.price)}</div>
                        <div className="pt-2">
                          <span className="inline-flex items-center justify-center w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold shadow-[0_10px_20px_rgba(37,99,235,0.32)]">
                            🛒 Buy Now
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {activeBundle && (
            <div className="fixed inset-0 z-50 bg-[#0f172a]/55 p-4 flex items-center justify-center backdrop-blur-[2px]">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-[0_25px_60px_rgba(2,6,23,0.35)] storefront-modal-enter overflow-hidden">
                <div className="bg-gradient-to-r from-[#2d57c7] to-[#6d84bd] px-4 py-3 flex items-center justify-between text-white">
                  <h3 className="font-sora text-xl font-semibold">🛒 Buy Data Bundle</h3>
                  <button type="button" onClick={() => setActiveBundle(null)} className="text-white/80 hover:text-white text-xl leading-none">×</button>
                </div>

                <div className="p-4 space-y-3">
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 font-medium">
                    {networkMeta[activeBundle.network].label} Data — {activeBundle.volume} — {formatCurrency(activeBundle.price)}
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-sm font-semibold text-slate-700">Confirmation Method</div>
                    <div className="rounded-lg bg-slate-100 p-1 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmationMethod("email")}
                        className={`rounded-md py-2 text-sm font-medium ${
                          confirmationMethod === "email" ? "bg-blue-600 text-white" : "text-slate-600"
                        }`}
                      >
                        ✉️ Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmationMethod("phone")}
                        className={`rounded-md py-2 text-sm font-medium ${
                          confirmationMethod === "phone" ? "bg-blue-600 text-white" : "text-slate-600"
                        }`}
                      >
                        📱 Phone
                      </button>
                    </div>
                  </div>

                  {confirmationMethod === "email" ? (
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700">Your Email</span>
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="example@email.com"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  ) : (
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700">Your Confirmation Phone</span>
                      <input
                        value={confirmationPhone}
                        onChange={(event) => setConfirmationPhone(event.target.value)}
                        placeholder="0241234567"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  )}

                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700">Recipient Phone</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="0241234567"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <span className="text-xs text-slate-500">Number that will receive the data bundle</span>
                  </label>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">🛡️ Payments are processed securely</div>
                  {error && <div className="text-xs text-rose-600">{error}</div>}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveBundle(null)}
                      className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={buyBundle}
                      disabled={submitting}
                      className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-semibold shadow-[0_12px_24px_rgba(37,99,235,0.34)] disabled:opacity-60"
                    >
                      {submitting ? "Redirecting..." : "💳 Pay Now"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-500 px-4 pt-5">
            Want your own storefront? <Link href="/agents" className="text-[var(--store-accent)]">Apply as an agent</Link>
          </div>
        </>
      )}
    </div>
  );
}
