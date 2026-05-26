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
      <section className="store-glass p-5 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,165,233,0.04)_45%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-2xl">
            <span className="store-pill px-3 py-1 text-xs">Instant data bundles</span>
            <h1 className="font-sora text-2xl md:text-3xl text-slate-900">Buy data in minutes.</h1>
            <p className="text-sm text-slate-600">Choose a network, pick a bundle, and complete payment securely.</p>
          </div>
          <Link href="/orders" className="store-outline px-4 py-2 text-sm w-fit bg-white/80">
            View my orders
          </Link>
        </div>
      </section>

      <section className="store-card p-0 overflow-hidden">
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Total bundles</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{totalBundles}</div>
            <div className="text-xs text-slate-500">Across all networks</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Selected network</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{networkMeta[selectedNetwork].label}</div>
            <div className="text-xs text-slate-500">Currently active tab</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Available now</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{availableBundles.length}</div>
            <div className="text-xs text-slate-500">Bundles in this network</div>
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
                    ? "bg-[var(--store-accent)] text-white border-[var(--store-accent)]"
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
                className={`rounded-2xl border ${meta.cardBorder} bg-[#ececec] px-2.5 py-3 flex flex-col items-center text-center shadow-[0_4px_10px_rgba(15,23,42,0.08)] min-h-[162px]`}
              >
                <div className={`h-7 w-7 rounded-md ${meta.logoBg} ${meta.logoText} text-[10px] font-semibold flex items-center justify-center`}>
                  {meta.short}
                </div>
                <div className="mt-3 text-[28px] font-semibold text-slate-900 leading-none tracking-tight">{bundle.volume}</div>
                <div className="mt-2 text-lg font-medium text-emerald-600">GHS {Number(bundle.price).toFixed(2)}</div>
                <button
                  type="button"
                  onClick={() => openModal(bundle)}
                  className="mt-auto w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium py-2.5 hover:from-blue-700 hover:to-blue-800"
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

      <div className="fixed right-3 bottom-24 md:bottom-6 z-30">
        <button
          type="button"
          aria-label="WhatsApp support"
          className="h-12 w-12 rounded-full bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.35)] text-xl"
        >
          🟢
        </button>
      </div>

      {activeBundle && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] p-3 md:p-6 flex items-start md:items-center justify-center overflow-auto">
          <div className="w-full max-w-[560px] rounded-xl md:rounded-2xl border border-slate-300 bg-[#f4f5f7] shadow-[0_28px_70px_rgba(15,23,42,0.35)] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-4 md:px-6 py-4 flex items-center justify-between">
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

            <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
              <div className="rounded-lg border border-sky-300 bg-sky-100 px-4 py-3 text-sky-900 font-medium text-base md:text-lg leading-tight">
                ⓘ {networkMeta[activeBundle.network].label} Data - {activeBundle.volume} - GHS{" "}
                {Number(activeBundle.price).toFixed(2)}
              </div>

              <div className="space-y-2">
                <div className="text-xl md:text-2xl font-semibold text-slate-800">✉️ Confirmation Method</div>
                <div className="grid grid-cols-2 gap-0 rounded-lg overflow-hidden border border-blue-500">
                  <button
                    type="button"
                    onClick={() => setConfirmationMethod("email")}
                    className={`py-2.5 text-base md:text-lg font-medium ${
                      confirmationMethod === "email" ? "bg-blue-600 text-white" : "bg-white text-blue-700"
                    }`}
                  >
                    ✉️ Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmationMethod("phone")}
                    className={`py-2.5 text-base md:text-lg font-medium ${
                      confirmationMethod === "phone" ? "bg-blue-600 text-white" : "bg-white text-blue-700"
                    }`}
                  >
                    📱 Phone
                  </button>
                </div>
              </div>

              {confirmationMethod === "email" ? (
                <label className="space-y-2 block">
                  <span className="text-lg md:text-xl font-semibold text-slate-800">✉️ Your Email *</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="example@email.com"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base md:text-lg"
                  />
                </label>
              ) : (
                <label className="space-y-2 block">
                  <span className="text-lg md:text-xl font-semibold text-slate-800">📱 Confirmation Phone *</span>
                  <input
                    type="tel"
                    value={confirmationPhone}
                    onChange={(event) => setConfirmationPhone(event.target.value)}
                    placeholder="0241234567"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base md:text-lg"
                  />
                </label>
              )}

              <label className="space-y-2 block">
                <span className="text-lg md:text-xl font-semibold text-slate-800">📱 Recipient Phone (number to receive the data) *</span>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(event) => setRecipientPhone(event.target.value)}
                  placeholder="0241234567"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base md:text-lg"
                />
              </label>

              <div className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-3 text-amber-800 text-base md:text-lg font-medium">
                💳 Secure payment processing
              </div>

              {purchaseError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm md:text-base">
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

            <div className="px-4 md:px-6 py-4 border-t border-slate-300 flex justify-end gap-3 bg-white/75">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg bg-slate-500 text-white px-5 py-2.5 text-sm md:text-base font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurchase}
                disabled={submitting}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 text-sm md:text-base font-medium disabled:opacity-60"
              >
                {submitting ? "Redirecting..." : "💳 Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
