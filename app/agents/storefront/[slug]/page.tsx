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

type StorefrontOrder = {
  id: string;
  total: number;
  status: string;
  dataStatus: "PLACED" | "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED" | null;
  createdAt: string;
  deliveryInfo: {
    network: string | null;
    bundleId: string | null;
    phone: string | null;
    bundleName: string | null;
    bundleVolume: string | null;
    bundleNetwork: string | null;
  };
  payment: {
    reference: string;
    status: string;
  } | null;
};

type PaystackInit = { authorization_url?: string; data?: { authorization_url?: string } | null };

const resolveAuthUrl = (init: PaystackInit | null) => init?.authorization_url || init?.data?.authorization_url || null;
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const buildSyntheticEmail = (value: string) => {
  const normalized = value.replace(/\D/g, "");
  if (!normalized) return "";
  return `storefront+${normalized}@korelly.local`;
};

const networkMeta: Record<
  Bundle["network"],
  { label: string; short: string; emoji: string; chip: string }
> = {
  mtn: {
    label: "MTN",
    short: "MTN",
    emoji: "⚡",
    chip: "from-yellow-400 to-amber-300 text-black",
  },
  telecel: {
    label: "Telecel",
    short: "TEL",
    emoji: "🔥",
    chip: "from-rose-500 to-pink-400 text-white",
  },
  airteltigo: {
    label: "AirtelTigo",
    short: "AT",
    emoji: "✦",
    chip: "from-indigo-400 to-violet-400 text-white",
  },
};

const dataStatusTone: Record<string, string> = {
  PLACED: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  PROCESSING: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  FAILED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
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

  const [activeTab, setActiveTab] = useState<"data" | "vouchers" | "track">("data");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackOrders, setTrackOrders] = useState<StorefrontOrder[]>([]);

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

  const storeInitial = useMemo(() => {
    const name = storefrontQuery.data?.agent.storefrontName || "K";
    return name.trim().charAt(0).toUpperCase() || "K";
  }, [storefrontQuery.data?.agent.storefrontName]);

  const trackOrdersByPhone = async () => {
    if (!trackPhone.trim()) {
      setTrackError("Enter a phone number to track orders.");
      return;
    }
    setTrackLoading(true);
    setTrackError(null);
    try {
      const data = await apiFetch<StorefrontOrder[]>(
        `/api/agents/storefront/${encodeURIComponent(slug)}/track?phone=${encodeURIComponent(trackPhone.trim())}`
      );
      setTrackOrders(data || []);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : "Unable to track orders");
    } finally {
      setTrackLoading(false);
    }
  };

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

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const whatsappLink = storefrontQuery.data?.agent.whatsappNumber
    ? `https://wa.me/${storefrontQuery.data.agent.whatsappNumber.replace(/\D/g, "")}`
    : null;

  return (
    <div className="pulse-shell pb-28" data-network={selectedNetwork}>
      {storefrontQuery.isLoading && (
        <div className="px-4 py-16 text-center text-sm text-white/50">Igniting Data Pulse storefront...</div>
      )}
      {storefrontQuery.isError && (
        <div className="px-4 py-16 text-center text-sm text-rose-300">
          {storefrontQuery.error instanceof Error ? storefrontQuery.error.message : "Storefront unavailable"}
        </div>
      )}

      {storefrontQuery.data && (
        <>
          <section className="pulse-hero">
            <div className="relative z-10 space-y-4">
              <div className="pulse-avatar">{storeInitial}</div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  Data Pulse · Live store
                </div>
                <h1 className="font-sora text-3xl md:text-4xl font-semibold tracking-tight text-white">
                  {storefrontQuery.data.agent.storefrontName}
                </h1>
                <p className="text-sm text-white/55 max-w-md mx-auto leading-relaxed">
                  Premium data in seconds. Pick a network, choose a bundle, pay securely, and track delivery without leaving the pulse.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <a
                  href={`tel:${storefrontQuery.data.agent.contactPhone}`}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur"
                >
                  📞 {storefrontQuery.data.agent.contactPhone}
                </a>
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </section>

          <div className="px-3 md:px-5 -mt-6 relative z-20">
            {activeTab === "data" && (
              <div className="space-y-5">
                <div className="rounded-[28px] border border-white/10 bg-[#12121c]/95 p-4 md:p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Choose network</div>
                      <div className="text-sm text-white/70 mt-0.5">Colors shift with your selection</div>
                    </div>
                    <div className="text-xs text-white/40">{groupedBundles[selectedNetwork].length} plans</div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {(["mtn", "telecel", "airteltigo"] as const).map((network) => {
                      const active = selectedNetwork === network;
                      const meta = networkMeta[network];
                      return (
                        <button
                          key={network}
                          type="button"
                          onClick={() => setSelectedNetwork(network)}
                          className={`pulse-network-pill shrink-0 ${active ? "is-active" : ""}`}
                        >
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-black ${meta.chip}`}>
                            {meta.short}
                          </span>
                          <span>{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <section className="space-y-3">
                  <div className="flex items-end justify-between px-1">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                        {networkMeta[selectedNetwork].emoji} {networkMeta[selectedNetwork].label} bundles
                      </div>
                      <h2 className="font-sora text-xl text-white mt-1">Tap a plan to checkout</h2>
                    </div>
                  </div>

                  {groupedBundles[selectedNetwork].length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-white/45">
                      No {networkMeta[selectedNetwork].label} bundles available right now.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {groupedBundles[selectedNetwork].map((bundle, index) => (
                        <button
                          key={bundle.id}
                          type="button"
                          onClick={() => {
                            setActiveBundle(bundle);
                            setError(null);
                          }}
                          className="pulse-bundle-card text-left w-full p-4"
                          style={{ "--pulse-delay": `${Math.min(index * 45, 360)}ms` } as React.CSSProperties}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-[10px] font-black ${networkMeta[bundle.network].chip}`}
                            >
                              {networkMeta[bundle.network].short}
                            </div>
                            <span className="text-[10px] uppercase tracking-wide text-white/40">{bundle.validity}</span>
                          </div>
                          <div className="mt-4 space-y-1">
                            <div className="text-2xl font-black tracking-tight text-white">{bundle.volume}</div>
                            <div className="text-[11px] text-white/45 line-clamp-1">{bundle.name}</div>
                          </div>
                          <div className="mt-4 flex items-end justify-between gap-2">
                            <div className="text-lg font-bold" style={{ color: "var(--pulse-accent, #818cf8)" }}>
                              {formatCurrency(bundle.price)}
                            </div>
                            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                              Buy
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === "vouchers" && (
              <div className="rounded-[28px] border border-white/10 bg-[#12121c] p-8 text-center space-y-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl">🎟️</div>
                <h2 className="font-sora text-2xl text-white">Vouchers incoming</h2>
                <p className="text-sm text-white/50 max-w-sm mx-auto">
                  Gift codes and promo drops will land here soon. For now, grab a data bundle and keep the signal strong.
                </p>
              </div>
            )}

            {activeTab === "track" && (
              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/10 bg-[#12121c] p-5 space-y-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Order radar</div>
                    <h2 className="font-sora text-2xl text-white mt-1">Track your delivery</h2>
                    <p className="text-sm text-white/50 mt-1">Enter the phone number used at checkout.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={trackPhone}
                      onChange={(e) => setTrackPhone(e.target.value)}
                      placeholder="e.g. 0547419727"
                      className="pulse-input flex-1"
                      onKeyDown={(e) => e.key === "Enter" && trackOrdersByPhone()}
                    />
                    <button
                      type="button"
                      onClick={trackOrdersByPhone}
                      disabled={trackLoading}
                      className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
                      style={{ background: "var(--pulse-accent, #818cf8)" }}
                    >
                      {trackLoading ? "Scanning..." : "Track order"}
                    </button>
                  </div>
                  {trackError && <div className="text-xs text-rose-300">{trackError}</div>}
                </div>

                {!trackLoading && trackOrders.length === 0 && !trackError && (
                  <div className="rounded-3xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/45">
                    Enter your phone number above to surface order history.
                  </div>
                )}

                {trackOrders.length > 0 && (
                  <div className="space-y-3">
                    {trackOrders.map((order) => (
                      <div key={order.id} className="pulse-track-card space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-white/40">Order ID</div>
                            <div className="text-sm font-semibold text-white break-all">{order.id}</div>
                          </div>
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${
                              order.dataStatus ? dataStatusTone[order.dataStatus] : "bg-white/5 text-white/60 border-white/10"
                            }`}
                          >
                            {order.dataStatus || "PENDING"}
                          </span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 text-xs text-white/55">
                          <div>
                            <span className="text-white/35">Bundle: </span>
                            <span className="font-medium text-white">
                              {order.deliveryInfo.bundleName || order.deliveryInfo.bundleVolume || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/35">Network: </span>
                            <span className="font-medium text-white">
                              {order.deliveryInfo.bundleNetwork?.toUpperCase() || order.deliveryInfo.network?.toUpperCase() || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/35">Phone: </span>
                            <span className="font-medium text-white">{order.deliveryInfo.phone || "-"}</span>
                          </div>
                          <div>
                            <span className="text-white/35">Amount: </span>
                            <span className="font-medium text-white">{formatCurrency(order.total)}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-white/35">Date: </span>
                            <span className="font-medium text-white">{formatDate(order.createdAt)}</span>
                          </div>
                        </div>

                        {order.payment && (
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/40 border-t border-white/10 pt-2">
                            <span>Ref: {order.payment.reference}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full border ${
                                order.payment.status === "SUCCESS"
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                                  : order.payment.status === "FAILED"
                                    ? "bg-rose-500/15 text-rose-300 border-rose-400/30"
                                    : "bg-amber-500/15 text-amber-300 border-amber-400/30"
                              }`}
                            >
                              {order.payment.status}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-8 pb-4 text-center text-xs text-white/35">
              Want your own pulse storefront?{" "}
              <Link href="/agents" className="text-white/70 underline underline-offset-2">
                Apply as an agent
              </Link>
            </div>
          </div>

          <nav className="pulse-tab-bar">
            {(
              [
                { key: "data" as const, label: "Data", icon: "📶" },
                { key: "vouchers" as const, label: "Vouchers", icon: "🎟️" },
                { key: "track" as const, label: "Track", icon: "🛰️" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`pulse-tab-btn ${activeTab === tab.key ? "is-active" : ""}`}
              >
                <span className="pulse-tab-icon text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {activeBundle && (
            <>
              <div className="pulse-sheet-backdrop" onClick={() => !submitting && setActiveBundle(null)} />
              <div className="pulse-sheet">
                <div className="pulse-sheet-handle" />
                <div className="px-5 pt-4 pb-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Checkout</div>
                      <h3 className="font-sora text-2xl text-white mt-1">Buy data bundle</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => !submitting && setActiveBundle(null)}
                      className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-white/70"
                    >
                      ×
                    </button>
                  </div>

                  <div
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      borderColor: "color-mix(in srgb, var(--pulse-accent, #818cf8) 35%, transparent)",
                      background: "color-mix(in srgb, var(--pulse-accent, #818cf8) 12%, transparent)",
                    }}
                  >
                    <div className="text-sm font-semibold text-white">
                      {networkMeta[activeBundle.network].label} · {activeBundle.volume}
                    </div>
                    <div className="text-xs text-white/55 mt-0.5">{activeBundle.name} · {activeBundle.validity}</div>
                    <div className="mt-2 text-xl font-bold" style={{ color: "var(--pulse-accent, #818cf8)" }}>
                      {formatCurrency(activeBundle.price)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-white/80">Confirmation method</div>
                    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/5 p-1">
                      <button
                        type="button"
                        onClick={() => setConfirmationMethod("email")}
                        className={`rounded-xl py-2.5 text-sm font-medium transition ${
                          confirmationMethod === "email" ? "bg-white text-black" : "text-white/60"
                        }`}
                      >
                        ✉️ Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmationMethod("phone")}
                        className={`rounded-xl py-2.5 text-sm font-medium transition ${
                          confirmationMethod === "phone" ? "bg-white text-black" : "text-white/60"
                        }`}
                      >
                        📱 Phone
                      </button>
                    </div>
                  </div>

                  {confirmationMethod === "email" ? (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-white/80">Your email</span>
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="example@email.com"
                        className="pulse-input"
                      />
                    </label>
                  ) : (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-white/80">Confirmation phone</span>
                      <input
                        value={confirmationPhone}
                        onChange={(event) => setConfirmationPhone(event.target.value)}
                        placeholder="0241234567"
                        className="pulse-input"
                      />
                    </label>
                  )}

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-white/80">Recipient phone</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="0241234567"
                      className="pulse-input"
                    />
                    <span className="text-xs text-white/40">Number that will receive the data bundle</span>
                  </label>

                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-100">
                    🛡️ Payments are processed securely with Paystack
                  </div>
                  {error && <div className="text-xs text-rose-300">{error}</div>}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveBundle(null)}
                      disabled={submitting}
                      className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={buyBundle}
                      disabled={submitting}
                      className="flex-[1.4] rounded-2xl px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                      style={{ background: "var(--pulse-accent, #818cf8)" }}
                    >
                      {submitting ? "Redirecting..." : "Pay now"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
