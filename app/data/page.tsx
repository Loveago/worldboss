"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type DataBundle = {
  id: string;
  network: "mtn" | "telecel" | "airteltigo";
  name: string;
  price: number;
  volume: string;
  validity: string;
  segment?: string | null;
  tag?: string | null;
  badge?: string | null;
  logoUrl?: string | null;
};

type PaystackInit = {
  authorization_url?: string;
  data?: { authorization_url?: string } | null;
};

type BuyMethod = "email" | "phone";

const networkMeta: Record<
  DataBundle["network"],
  {
    label: string;
    tabLabel: string;
    short: string;
    tabIcon: string;
    cardBorder: string;
    logoBg: string;
    logoText: string;
  }
> = {
  mtn: {
    label: "MTN",
    tabLabel: "MTN Data",
    short: "MTN",
    tabIcon: "📶",
    cardBorder: "border-[#f0b800]",
    logoBg: "bg-yellow-400",
    logoText: "text-slate-900",
  },
  telecel: {
    label: "Telecel",
    tabLabel: "Telecel Data",
    short: "TL",
    tabIcon: "📍",
    cardBorder: "border-rose-500",
    logoBg: "bg-rose-600",
    logoText: "text-white",
  },
  airteltigo: {
    label: "AirtelTigo",
    tabLabel: "AirtelTigo iShare",
    short: "AT",
    tabIcon: "📌",
    cardBorder: "border-slate-700",
    logoBg: "bg-red-600",
    logoText: "text-white",
  },
};

const networkTabs = [
  { id: "mtn", label: "MTN Data" },
  { id: "telecel", label: "Telecel Data" },
  { id: "airteltigo", label: "AirtelTigo iShare" },
] as const;

const seededBundles: DataBundle[] = [
  { id: "seed-mtn-1_2gb", network: "mtn", name: "MTN Data", volume: "1.2GB", price: 8.0, validity: "Anytime" },
  { id: "seed-mtn-1gb", network: "mtn", name: "MTN Data", volume: "1GB", price: 4.9, validity: "Anytime" },
  { id: "seed-mtn-2gb", network: "mtn", name: "MTN Data", volume: "2GB", price: 9.9, validity: "Anytime" },
  { id: "seed-mtn-3gb", network: "mtn", name: "MTN Data", volume: "3GB", price: 15.0, validity: "Anytime" },
  { id: "seed-mtn-4gb", network: "mtn", name: "MTN Data", volume: "4GB", price: 20.0, validity: "Anytime" },
  { id: "seed-mtn-5gb", network: "mtn", name: "MTN Data", volume: "5GB", price: 25.0, validity: "Anytime" },
  { id: "seed-mtn-6gb", network: "mtn", name: "MTN Data", volume: "6GB", price: 29.0, validity: "Anytime" },
  { id: "seed-mtn-7gb", network: "mtn", name: "MTN Data", volume: "7GB", price: 34.0, validity: "Anytime" },
  { id: "seed-mtn-8gb", network: "mtn", name: "MTN Data", volume: "8GB", price: 38.0, validity: "Anytime" },
  { id: "seed-mtn-10gb", network: "mtn", name: "MTN Data", volume: "10GB", price: 47.0, validity: "Anytime" },
  { id: "seed-mtn-12gb", network: "mtn", name: "MTN Data", volume: "12GB", price: 56.1, validity: "Anytime" },
  { id: "seed-mtn-15gb", network: "mtn", name: "MTN Data", volume: "15GB", price: 68.2, validity: "Anytime" },
  { id: "seed-mtn-20gb", network: "mtn", name: "MTN Data", volume: "20GB", price: 92.4, validity: "Anytime" },

  { id: "seed-telecel-5gb", network: "telecel", name: "Telecel Data", volume: "5GB", price: 26.4, validity: "Anytime" },
  { id: "seed-telecel-10gb", network: "telecel", name: "Telecel Data", volume: "10GB", price: 46.2, validity: "Anytime" },
  { id: "seed-telecel-15gb", network: "telecel", name: "Telecel Data", volume: "15GB", price: 66.0, validity: "Anytime" },
  { id: "seed-telecel-20gb", network: "telecel", name: "Telecel Data", volume: "20GB", price: 85.8, validity: "Anytime" },
  { id: "seed-telecel-25gb", network: "telecel", name: "Telecel Data", volume: "25GB", price: 107.8, validity: "Anytime" },
  { id: "seed-telecel-30gb", network: "telecel", name: "Telecel Data", volume: "30GB", price: 127.6, validity: "Anytime" },
  { id: "seed-telecel-40gb", network: "telecel", name: "Telecel Data", volume: "40GB", price: 166.1, validity: "Anytime" },
  { id: "seed-telecel-50gb", network: "telecel", name: "Telecel Data", volume: "50GB", price: 203.5, validity: "Anytime" },

  { id: "seed-at-1gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "1GB", price: 4.95, validity: "Anytime" },
  { id: "seed-at-2gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "2GB", price: 9.9, validity: "Anytime" },
  { id: "seed-at-3gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "3GB", price: 15.4, validity: "Anytime" },
  { id: "seed-at-4gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "4GB", price: 19.8, validity: "Anytime" },
  { id: "seed-at-5gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "5GB", price: 24.2, validity: "Anytime" },
  { id: "seed-at-6gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "6GB", price: 26.4, validity: "Anytime" },
  { id: "seed-at-7gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "7GB", price: 30.8, validity: "Anytime" },
  { id: "seed-at-8gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "8GB", price: 35.2, validity: "Anytime" },
  { id: "seed-at-10gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "10GB", price: 42.9, validity: "Anytime" },
  { id: "seed-at-12gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "12GB", price: 52.8, validity: "Anytime" },
  { id: "seed-at-15gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "15GB", price: 66.0, validity: "Anytime" },
  { id: "seed-at-20gb", network: "airteltigo", name: "AirtelTigo iShare", volume: "20GB", price: 86.9, validity: "Anytime" },
];

const resolveAuthUrl = (init: PaystackInit | null) =>
  init?.authorization_url || init?.data?.authorization_url || null;

const isValidEmail = (value: string) => /.+@.+\..+/.test(value);

const buildSyntheticEmail = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 ? `${digits}@phone.bossmarket.app` : "";
};

export default function DataPage() {
  const [selectedNetwork, setSelectedNetwork] = useState<(typeof networkTabs)[number]["id"]>("mtn");
  const [activeBundle, setActiveBundle] = useState<DataBundle | null>(null);
  const [confirmationMethod, setConfirmationMethod] = useState<BuyMethod>("email");
  const [email, setEmail] = useState("");
  const [confirmationPhone, setConfirmationPhone] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bundlesQuery = useQuery<DataBundle[]>({
    queryKey: ["data-bundles"],
    queryFn: () => apiFetch<DataBundle[]>("/api/data/bundles"),
  });

  const remoteBundles = Array.isArray(bundlesQuery.data) ? (bundlesQuery.data as DataBundle[]) : [];
  const hasRemoteBundles = remoteBundles.length > 0;
  const bundles = hasRemoteBundles ? remoteBundles : seededBundles;
  const availableBundles = useMemo(
    () => bundles.filter((bundle) => bundle.network === selectedNetwork),
    [bundles, selectedNetwork]
  );
  const totalBundles = bundles.length;

  const showBundleSkeleton = bundlesQuery.isLoading && !hasRemoteBundles;

  const bundleError = bundlesQuery.isError
    ? bundlesQuery.error instanceof Error
      ? bundlesQuery.error.message
      : "Unable to load bundles right now."
    : null;

  const closeModal = () => {
    if (submitting) return;
    setActiveBundle(null);
    setError(null);
  };

  const openModal = (bundle: DataBundle) => {
    setActiveBundle(bundle);
    setConfirmationMethod("email");
    setEmail("");
    setConfirmationPhone("");
    setRecipientPhone("");
    setError(null);
  };

  const handlePurchase = async () => {
    if (!activeBundle) {
      setError("Select a bundle to continue.");
      return;
    }

    if (!recipientPhone.trim()) {
      setError("Enter the phone number to top up.");
      return;
    }

    const checkoutEmail =
      confirmationMethod === "email" ? email.trim() : buildSyntheticEmail(confirmationPhone.trim() || recipientPhone.trim());

    if (confirmationMethod === "email" && !isValidEmail(checkoutEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (confirmationMethod === "phone" && !confirmationPhone.trim()) {
      setError("Enter your confirmation phone number.");
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
          phone: recipientPhone.trim(),
        }),
      });

      const init = await apiFetch<PaystackInit>("/api/payments/paystack/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: purchase.orderId, email: checkoutEmail }),
      });

      const authUrl = resolveAuthUrl(init);
      if (!authUrl) {
        throw new Error("Unable to initialize Paystack checkout.");
      }
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const purchaseError = error;
  const isUnauthorized = purchaseError?.toLowerCase().includes("unauthorized");

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="kb-cosmos-panel p-5 md:p-7">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-2xl">
            <span className="kb-chip bg-white/10 text-white border border-white/15">Instant data bundles</span>
            <h1 className="font-sora text-[1.75rem] leading-[1.05] md:text-3xl text-white">Buy data in minutes.</h1>
            <p className="text-[13px] md:text-sm text-white/70">Choose a network, pick a bundle, and complete payment securely.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            <Link href="/orders" className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-center text-white hover:bg-white/15 transition">
              View my orders
            </Link>
            <Link href="/shop" className="store-btn-primary px-4 py-2.5 text-sm text-center">
              Shop products
            </Link>
          </div>
        </div>
      </section>

      <section className="hidden md:grid sm:grid-cols-3 gap-3">
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Total bundles</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{totalBundles}</div>
          <div className="text-xs text-slate-500">Across all networks</div>
        </div>
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Selected network</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{networkMeta[selectedNetwork].label}</div>
          <div className="text-xs text-slate-500">Currently active tab</div>
        </div>
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Available now</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{availableBundles.length}</div>
          <div className="text-xs text-slate-500">Bundles in this network</div>
        </div>
      </section>

      <section className="md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <div className="store-metric px-2.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Bundles</div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">{totalBundles}</div>
          </div>
          <div className="store-metric px-2.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Network</div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">{networkMeta[selectedNetwork].label}</div>
          </div>
          <div className="store-metric px-2.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Available</div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">{availableBundles.length}</div>
          </div>
        </div>
      </section>

      <section className="store-card p-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {networkTabs.map((network) => {
            const active = selectedNetwork === network.id;
            return (
              <button
                key={network.id}
                type="button"
                onClick={() => setSelectedNetwork(network.id)}
                className={`rounded-xl px-3 py-2 text-xs md:text-sm font-medium border transition flex items-center gap-2 ${
                  active
                    ? "bg-[var(--store-accent)] text-white border-[var(--store-accent)] shadow-[0_8px_18px_rgba(99,102,241,0.28)]"
                    : "bg-white text-slate-700 border-[var(--store-border)] hover:bg-slate-50"
                }`}
              >
                <span>{networkMeta[network.id].tabIcon}</span>
                <span>{networkMeta[network.id].tabLabel}</span>
              </button>
            );
          })}
        </div>
      </section>

      {bundleError && <div className="store-card p-4 text-sm text-rose-600">{bundleError}</div>}

      {showBundleSkeleton ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 p-4 h-[156px] animate-pulse bg-white">
              <div className="h-6 w-6 rounded mx-auto bg-slate-200" />
              <div className="h-5 w-16 bg-slate-200 rounded mx-auto mt-4" />
              <div className="h-5 w-20 bg-slate-200 rounded mx-auto mt-3" />
              <div className="h-8 bg-slate-200 rounded-lg mt-6" />
            </div>
          ))}
        </div>
      ) : availableBundles.length ? (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {availableBundles.map((bundle) => {
            const meta = networkMeta[bundle.network];
            return (
              <article
                key={bundle.id}
                className={`rounded-2xl border ${meta.cardBorder} bg-white px-2.5 py-3 flex flex-col items-center text-center shadow-[0_8px_20px_rgba(15,23,42,0.08)] min-h-[168px] store-tile-lift`}
              >
                <div className={`h-7 w-7 rounded-md ${meta.logoBg} ${meta.logoText} text-[10px] font-semibold flex items-center justify-center`}>
                  {meta.short}
                </div>
                <div className="mt-3 text-[28px] font-semibold text-slate-900 leading-none tracking-tight">{bundle.volume}</div>
                <div className="mt-2 text-lg font-medium text-emerald-600">GHS {Number(bundle.price).toFixed(2)}</div>
                <button
                  type="button"
                  onClick={() => openModal(bundle)}
                  className="mt-auto w-full store-btn-primary text-xs font-medium py-2.5"
                >
                  🛒 BUY NOW
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="store-card p-4 text-sm text-slate-500">No bundles available for this network.</div>
      )}

      <a
        href="https://chat.whatsapp.com/GbPWhbaiybQLFgDwcx2182?s=cl&p=a&mlu=1"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-3 bottom-24 md:bottom-6 z-30"
        aria-label="Join our WhatsApp group"
      >
        <div className="h-14 w-14 rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.45)] flex items-center justify-center hover:scale-105 transition-transform">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.434-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
      </a>

      {activeBundle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-2 md:p-6 flex items-end md:items-center justify-center">
          <div className="w-full max-w-[560px] rounded-2xl border border-[var(--store-border)] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.35)] overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--store-accent)] to-violet-600 text-white px-3 md:px-6 py-3 md:py-4 flex items-center justify-between">
              <div className="text-lg md:text-xl font-semibold flex items-center gap-2">🛒 Buy Data Bundle</div>
              <button
                type="button"
                onClick={closeModal}
                className="text-white/85 hover:text-white text-2xl"
                aria-label="Close popup"
              >
                ×
              </button>
            </div>

            <div className="px-3 md:px-6 py-3 md:py-5 space-y-3 md:space-y-5">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 md:px-4 md:py-3 text-indigo-900 font-medium text-sm md:text-lg leading-tight">
                ⓘ {networkMeta[activeBundle.network].label} Data - {activeBundle.volume} - GHS{" "}
                {Number(activeBundle.price).toFixed(2)}
              </div>

              <div className="space-y-2">
                <div className="text-sm md:text-lg font-semibold text-slate-800">✉️ Confirmation Method</div>
                <div className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden border border-[var(--store-accent)]">
                  <button
                    type="button"
                    onClick={() => setConfirmationMethod("email")}
                    className={`py-2.5 text-sm md:text-base font-medium ${
                      confirmationMethod === "email" ? "bg-[var(--store-accent)] text-white" : "bg-white text-[var(--store-accent)]"
                    }`}
                  >
                    ✉️ Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmationMethod("phone")}
                    className={`py-2.5 text-sm md:text-base font-medium ${
                      confirmationMethod === "phone" ? "bg-[var(--store-accent)] text-white" : "bg-white text-[var(--store-accent)]"
                    }`}
                  >
                    📱 Phone
                  </button>
                </div>
              </div>

              {confirmationMethod === "email" ? (
                <label className="space-y-2 block">
                  <span className="text-sm md:text-base font-semibold text-slate-800">✉️ Your Email *</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="example@email.com"
                    className="kb-input text-base"
                  />
                </label>
              ) : (
                <label className="space-y-2 block">
                  <span className="text-sm md:text-base font-semibold text-slate-800">📱 Confirmation Phone *</span>
                  <input
                    type="tel"
                    value={confirmationPhone}
                    onChange={(event) => setConfirmationPhone(event.target.value)}
                    placeholder="0241234567"
                    className="kb-input text-base"
                  />
                </label>
              )}

              <label className="space-y-2 block">
                <span className="text-sm md:text-base font-semibold text-slate-800">📱 Recipient Phone (number to receive the data) *</span>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(event) => setRecipientPhone(event.target.value)}
                  placeholder="0241234567"
                  className="kb-input text-base"
                />
              </label>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm md:text-base font-medium">
                💳 Secure payment processing
              </div>

              {purchaseError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm md:text-base">
                  {isUnauthorized ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span>Sign in to complete this purchase.</span>
                      <Link href="/login" className="store-outline px-3 py-1.5 text-xs md:text-sm inline-flex">
                        Sign in
                      </Link>
                    </div>
                  ) : (
                    purchaseError
                  )}
                </div>
              )}
            </div>

            <div className="px-3 md:px-6 py-3 md:py-4 border-t border-slate-200 flex gap-2 bg-slate-50/80">
              <button
                type="button"
                onClick={closeModal}
                className="store-outline px-4 py-2.5 text-sm md:text-base font-medium flex-1 md:flex-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurchase}
                disabled={submitting}
                className="store-btn-primary px-4 md:px-6 py-2.5 text-sm md:text-base font-medium disabled:opacity-60 flex-1 md:flex-none"
              >
                {submitting ? "..." : "💳 Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
