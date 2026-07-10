"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type NetworkFilter = "all" | "mtn" | "telecel" | "airteltigo";
type BundleSortKey = "volume" | "basePrice" | "finalPrice" | "markup";
type SectionKey = "overview" | "storefront" | "pricing" | "wallet" | "withdrawals" | "orders";

type DashboardPayload = {
  hasApplication: boolean;
  isApproved: boolean;
  profile: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    storefrontSlug: string;
    storefrontName: string;
    contactPhone: string;
    whatsappNumber: string;
    markups: Record<string, number>;
  } | null;
  bundles: Array<{
    id: string;
    network: "mtn" | "telecel" | "airteltigo";
    name: string;
    volume: string;
    validity: string;
    basePrice: number;
    markup: number;
    finalPrice: number;
  }>;
  wallet: {
    balance: number;
    totalCommissions: number;
    totalWithdrawalsReserved: number;
  };
  stats: {
    salesCount: number;
    tier: number;
    badge: string;
  };
  withdrawals: Array<{
    id: string;
    amount: number;
    status: "INITIATED" | "SUCCESS" | "FAILED";
    createdAt: string;
    momoNumber: string;
    momoName: string;
    momoNetwork: string;
  }>;
  storefrontLink: string | null;
};

type StorefrontOrder = {
  id: string;
  total: number;
  dataStatus: "PLACED" | "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED" | null;
  createdAt: string;
  deliveryInfo: {
    network?: string | null;
    bundleId?: string | null;
    phone?: string | null;
    basePrice?: number | null;
    agentMarkup?: number | null;
    guestCheckout?: boolean;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
  } | null;
  payment: {
    reference: string;
    status: string;
  } | null;
};

const humanize = (value?: string | null) => {
  if (!value) return "-";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const networkLabel: Record<Exclude<NetworkFilter, "all">, string> = {
  mtn: "MTN",
  telecel: "Telecel",
  airteltigo: "AirtelTigo",
};

const networkTone: Record<Exclude<NetworkFilter, "all">, string> = {
  mtn: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30",
  telecel: "bg-rose-500/20 text-rose-300 border-rose-400/30",
  airteltigo: "bg-indigo-400/20 text-indigo-300 border-indigo-400/30",
};

const parseVolumeRank = (value: string) => {
  const numeric = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const navItems: Array<{ key: SectionKey; label: string; icon: string; hint: string }> = [
  { key: "overview", label: "Command", icon: "◈", hint: "Mission control" },
  { key: "storefront", label: "Storefront", icon: "◉", hint: "Brand & contact" },
  { key: "pricing", label: "Pricing", icon: "◎", hint: "Markup engine" },
  { key: "wallet", label: "Wallet", icon: "◇", hint: "Funds & payouts" },
  { key: "withdrawals", label: "Payouts", icon: "⬡", hint: "History trail" },
  { key: "orders", label: "Orders", icon: "▣", hint: "Live sales feed" },
];

const orderStatusTone: Record<string, string> = {
  DELIVERED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  FAILED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  PROCESSING: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
  PLACED: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-400/30",
};

export default function AgentDashboardPage() {
  const queryClient = useQueryClient();
  const [storefrontName, setStorefrontName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [markups, setMarkups] = useState<Record<string, number>>({});

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoName, setMomoName] = useState("");
  const [momoNetwork, setMomoNetwork] = useState<"mtn" | "telecel" | "airteltigo">("mtn");
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>("all");
  const [pricingSearch, setPricingSearch] = useState("");
  const [bundleSortKey, setBundleSortKey] = useState<BundleSortKey>("volume");
  const [bundleSortDirection, setBundleSortDirection] = useState<"asc" | "desc">("asc");
  const [copied, setCopied] = useState(false);

  const dashboardQuery = useQuery<DashboardPayload>({
    queryKey: ["agent-dashboard"],
    queryFn: () => apiFetch<DashboardPayload>("/api/agent/dashboard"),
  });

  React.useEffect(() => {
    const profile = dashboardQuery.data?.profile;
    if (!profile) return;
    setStorefrontName(profile.storefrontName || "");
    setContactPhone(profile.contactPhone || "");
    setWhatsappNumber(profile.whatsappNumber || "");
    setMarkups(profile.markups || {});
  }, [dashboardQuery.data?.profile]);

  const saveStoreMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ updated: boolean }>("/api/agent/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storefrontName,
          contactPhone,
          whatsappNumber,
          markups,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] }),
  });

  const withdrawMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ requested: boolean }>("/api/agent/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          momoNumber,
          momoName,
          momoNetwork,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] });
      setWithdrawAmount("");
      setMomoName("");
      setMomoNumber("");
    },
  });

  const data = dashboardQuery.data;

  const pricingRows = useMemo(() => {
    const list = data?.bundles || [];
    const query = pricingSearch.trim().toLowerCase();

    const rows = list
      .map((bundle) => {
        const liveMarkup = Number(markups[bundle.id] ?? bundle.markup ?? 0);
        const liveFinalPrice = bundle.basePrice + liveMarkup;
        return {
          ...bundle,
          liveMarkup,
          liveFinalPrice,
        };
      })
      .filter((bundle) => {
        const networkMatches = networkFilter === "all" ? true : bundle.network === networkFilter;
        if (!networkMatches) return false;
        if (!query) return true;
        const text = `${bundle.name} ${bundle.volume} ${bundle.validity} ${bundle.network}`.toLowerCase();
        return text.includes(query);
      })
      .sort((a, b) => {
        let left = 0;
        let right = 0;

        if (bundleSortKey === "volume") {
          left = parseVolumeRank(a.volume);
          right = parseVolumeRank(b.volume);
        } else if (bundleSortKey === "basePrice") {
          left = a.basePrice;
          right = b.basePrice;
        } else if (bundleSortKey === "finalPrice") {
          left = a.liveFinalPrice;
          right = b.liveFinalPrice;
        } else {
          left = a.liveMarkup;
          right = b.liveMarkup;
        }

        const result = left - right;
        return bundleSortDirection === "asc" ? result : -result;
      });

    return rows;
  }, [bundleSortDirection, bundleSortKey, data?.bundles, markups, networkFilter, pricingSearch]);

  const ordersQuery = useQuery<StorefrontOrder[]>({
    queryKey: ["agent-orders"],
    queryFn: () => apiFetch<StorefrontOrder[]>("/api/agent/orders"),
    enabled: Boolean(data?.isApproved),
  });

  const jumpTo = (section: SectionKey) => {
    setActiveSection(section);
    const target = document.getElementById(`agent-${section}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyStoreLink = async () => {
    if (!data?.storefrontLink) return;
    try {
      await navigator.clipboard.writeText(
        typeof window !== "undefined" ? `${window.location.origin}${data.storefrontLink}` : data.storefrontLink
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const totalMarkupPotential = useMemo(() => {
    return pricingRows.reduce((sum, row) => sum + row.liveMarkup, 0);
  }, [pricingRows]);

  return (
    <div className="agent-cosmos space-y-4 md:space-y-6 min-w-0 max-w-full">
      <section id="agent-overview" className="agent-cosmos-hero">
        <div className="relative z-10 space-y-4 md:space-y-5 min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="space-y-2 max-w-2xl min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase text-indigo-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                Cosmos Command Center
              </div>
              <h1 className="font-sora text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight break-words">
                {data?.profile?.storefrontName || "Agent Command Deck"}
              </h1>
              <p className="text-sm text-indigo-100/80 leading-relaxed">
                Orchestrate storefront identity, live markup pricing, wallet velocity, and order flow from one cinematic control surface.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm w-full sm:w-auto shrink-0">
              <div className="text-[10px] uppercase tracking-[0.16em] text-indigo-200/70">Clearance</div>
              <div className="mt-1 text-lg font-semibold text-white">{data?.profile?.status || "Not applied"}</div>
              <div className="mt-0.5 text-xs text-indigo-100/70">Tier {data?.stats.tier ?? "—"} · {data?.stats.badge || "No badge"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            <div className="agent-stat-card min-w-0">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-indigo-200/70">Sales pulse</div>
              <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-semibold text-white truncate">{data?.stats.salesCount ?? 0}</div>
              <div className="mt-1 text-[10px] sm:text-xs text-indigo-100/60 leading-snug">Completed orders</div>
            </div>
            <div className="agent-stat-card min-w-0">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-indigo-200/70">Agent badge</div>
              <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-semibold text-white truncate">{data?.stats.badge || "—"}</div>
              <div className="mt-1 text-[10px] sm:text-xs text-indigo-100/60 leading-snug">Rank signal</div>
            </div>
            <div className="agent-stat-card min-w-0">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-indigo-200/70">Wallet fuel</div>
              <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-semibold text-white truncate">{formatCurrency(data?.wallet.balance ?? 0)}</div>
              <div className="mt-1 text-[10px] sm:text-xs text-indigo-100/60 leading-snug">Available</div>
            </div>
            <div className="agent-stat-card min-w-0">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-indigo-200/70">Commissions</div>
              <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-semibold text-white truncate">{formatCurrency(data?.wallet.totalCommissions ?? 0)}</div>
              <div className="mt-1 text-[10px] sm:text-xs text-indigo-100/60 leading-snug">Lifetime earned</div>
            </div>
          </div>
        </div>
      </section>

      {dashboardQuery.isLoading && (
        <div className="agent-panel p-5 text-sm text-[var(--store-muted)]">Syncing command telemetry...</div>
      )}
      {dashboardQuery.isError && (
        <div className="agent-panel p-5 text-sm text-rose-500">
          {dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Unable to load dashboard"}
        </div>
      )}

      {data && (
        <>
          {!data.hasApplication && (
            <div className="agent-panel p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-sora text-lg text-[var(--store-ink)]">No agent clearance yet</div>
                <p className="text-sm text-[var(--store-muted)] mt-1">Apply from your profile to unlock storefront controls and commission tools.</p>
              </div>
              <Link href="/agents" className="agent-btn-primary inline-flex items-center">
                Launch application
              </Link>
            </div>
          )}

          {data.hasApplication && !data.isApproved && (
            <div className="agent-panel p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 text-lg">⌛</span>
                <div>
                  <div className="font-sora text-lg text-[var(--store-ink)]">Awaiting admin approval</div>
                  <p className="text-sm text-[var(--store-muted)] mt-0.5">
                    Status: <span className="font-semibold text-[var(--store-ink)]">{data.profile?.status}</span>. Storefront and wallet tools unlock once approved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {data.isApproved && data.profile && (
            <div className="grid gap-4 md:gap-5 lg:grid-cols-[240px_minmax(0,1fr)] min-w-0">
              <aside className="lg:sticky lg:top-4 h-fit space-y-3 min-w-0">
                <nav className="agent-nav-rail">
                  {navItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => jumpTo(item.key)}
                      className={`agent-nav-item ${activeSection === item.key ? "is-active" : ""}`}
                    >
                      <span className="text-base leading-none opacity-90">{item.icon}</span>
                      <span className="min-w-0">
                        <span className="block">{item.label}</span>
                        <span className={`block text-[10px] ${activeSection === item.key ? "text-white/70" : "text-[var(--store-muted)]"}`}>
                          {item.hint}
                        </span>
                      </span>
                    </button>
                  ))}
                </nav>

                <div className="agent-panel p-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--store-muted)]">Quick share</div>
                  {data.storefrontLink ? (
                    <>
                      <Link
                        href={data.storefrontLink}
                        className="block text-sm font-medium text-[var(--store-accent)] break-all hover:underline"
                      >
                        {data.storefrontLink}
                      </Link>
                      <button type="button" onClick={copyStoreLink} className="agent-btn-primary w-full">
                        {copied ? "Link copied" : "Copy storefront link"}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--store-muted)]">Storefront link will appear once ready.</p>
                  )}
                </div>
              </aside>

              <div className="space-y-4 md:space-y-5 min-w-0 max-w-full">
                <section id="agent-storefront" className="agent-panel p-3 sm:p-4 md:p-6 space-y-4 md:space-y-5 min-w-0 overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--store-muted)]">Identity</div>
                      <h2 className="font-sora text-2xl text-[var(--store-ink)] mt-1">Storefront settings</h2>
                      <p className="text-sm text-[var(--store-muted)] mt-1">Tune how customers see and reach your store.</p>
                    </div>
                    <span className="store-pill px-3 py-1 text-[11px] font-semibold">{data.stats.badge}</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="agent-metric p-3">
                      <div className="text-[11px] text-[var(--store-muted)]">Sales</div>
                      <div className="mt-1 text-xl font-semibold text-[var(--store-ink)]">{data.stats.salesCount}</div>
                    </div>
                    <div className="agent-metric p-3">
                      <div className="text-[11px] text-[var(--store-muted)]">Slug</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--store-ink)] break-all">{data.profile.storefrontSlug}</div>
                    </div>
                    <div className="agent-metric p-3">
                      <div className="text-[11px] text-[var(--store-muted)]">Status</div>
                      <div className="mt-1 text-sm font-semibold text-emerald-500">{data.profile.status}</div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-1.5 md:col-span-1">
                      <span className="text-xs font-medium text-[var(--store-muted)]">Storefront name</span>
                      <input
                        className="agent-input"
                        value={storefrontName}
                        onChange={(event) => setStorefrontName(event.target.value)}
                        placeholder="e.g. Data Kings GH"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-[var(--store-muted)]">Phone number</span>
                      <input
                        className="agent-input"
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        placeholder="024..."
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-[var(--store-muted)]">WhatsApp number</span>
                      <input
                        className="agent-input"
                        value={whatsappNumber}
                        onChange={(event) => setWhatsappNumber(event.target.value)}
                        placeholder="024..."
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => saveStoreMutation.mutate()}
                      disabled={saveStoreMutation.isLoading}
                      className="agent-btn-primary"
                    >
                      {saveStoreMutation.isLoading ? "Saving identity..." : "Save storefront"}
                    </button>
                    {data.storefrontLink && (
                      <Link href={data.storefrontLink} className="agent-btn-dark inline-flex items-center">
                        Open live store
                      </Link>
                    )}
                  </div>
                </section>

                <section id="agent-pricing" className="agent-panel p-3 sm:p-4 md:p-6 space-y-4 min-w-0 overflow-hidden">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--store-muted)]">Revenue engine</div>
                    <h2 className="font-sora text-xl md:text-2xl text-[var(--store-ink)] mt-1">Bundle markup pricing</h2>
                    <p className="text-sm text-[var(--store-muted)] mt-1 break-words">
                      {pricingRows.length} bundle(s) · markup stack {formatCurrency(totalMarkupPotential)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0">
                    <label className="space-y-1.5 min-w-0">
                      <span className="text-xs font-medium text-[var(--store-muted)]">Filter network</span>
                      <select
                        value={networkFilter}
                        onChange={(event) => setNetworkFilter(event.target.value as NetworkFilter)}
                        className="agent-input"
                      >
                        <option value="all">All networks</option>
                        <option value="mtn">MTN</option>
                        <option value="telecel">Telecel</option>
                        <option value="airteltigo">AirtelTigo</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 min-w-0">
                      <span className="text-xs font-medium text-[var(--store-muted)]">Search bundle</span>
                      <input
                        value={pricingSearch}
                        onChange={(event) => setPricingSearch(event.target.value)}
                        className="agent-input"
                        placeholder="e.g. 5GB, weekly"
                      />
                    </label>
                    <label className="space-y-1.5 min-w-0">
                      <span className="text-xs font-medium text-[var(--store-muted)]">Sort by</span>
                      <select
                        value={bundleSortKey}
                        onChange={(event) => setBundleSortKey(event.target.value as BundleSortKey)}
                        className="agent-input"
                      >
                        <option value="volume">Volume</option>
                        <option value="basePrice">Base price</option>
                        <option value="markup">Markup</option>
                        <option value="finalPrice">Final price</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 min-w-0">
                      <span className="text-xs font-medium text-[var(--store-muted)]">Order</span>
                      <select
                        value={bundleSortDirection}
                        onChange={(event) => setBundleSortDirection(event.target.value as "asc" | "desc")}
                        className="agent-input"
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </label>
                  </div>

                  {pricingRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--store-border)] px-4 py-8 text-center text-sm text-[var(--store-muted)]">
                      No bundles match your current filters.
                    </div>
                  ) : (
                    <div className="space-y-2.5 min-w-0">
                      {pricingRows.map((bundle) => (
                        <div key={bundle.id} className="agent-pricing-row grid grid-cols-1 gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-base font-semibold text-[var(--store-ink)]">{bundle.volume}</div>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${networkTone[bundle.network]}`}>
                                {networkLabel[bundle.network]}
                              </span>
                            </div>
                            <div className="text-xs text-[var(--store-muted)] mt-1 break-words">
                              {bundle.name} · {bundle.validity}
                            </div>
                            <div className="text-xs text-[var(--store-muted)] mt-0.5 break-words">
                              Base {formatCurrency(bundle.basePrice)} → Final{" "}
                              <span className="font-semibold text-[var(--store-ink)]">{formatCurrency(bundle.liveFinalPrice)}</span>
                            </div>
                          </div>
                          <label className="flex items-center justify-between gap-2 min-w-0 sm:max-w-[220px]">
                            <span className="text-xs font-medium text-[var(--store-muted)] shrink-0">Markup</span>
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              value={markups[bundle.id] ?? 0}
                              onChange={(event) =>
                                setMarkups((prev) => ({
                                  ...prev,
                                  [bundle.id]: Number(event.target.value || 0),
                                }))
                              }
                              className="agent-input w-[120px] max-w-[45vw] shrink-0"
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => saveStoreMutation.mutate()}
                    disabled={saveStoreMutation.isLoading}
                    className="agent-btn-primary w-full sm:w-auto"
                  >
                    {saveStoreMutation.isLoading ? "Saving pricing..." : "Save pricing changes"}
                  </button>
                </section>

                <div className="grid gap-4 md:gap-5 xl:grid-cols-2 min-w-0">
                  <section id="agent-wallet" className="agent-panel p-3 sm:p-4 md:p-6 space-y-4 min-w-0 overflow-hidden">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--store-muted)]">Liquidity</div>
                      <h2 className="font-sora text-2xl text-[var(--store-ink)] mt-1">Agent wallet</h2>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="agent-metric p-3">
                        <div className="text-[11px] text-[var(--store-muted)]">Available</div>
                        <div className="mt-1 font-semibold text-[var(--store-ink)]">{formatCurrency(data.wallet.balance)}</div>
                      </div>
                      <div className="agent-metric p-3">
                        <div className="text-[11px] text-[var(--store-muted)]">Commissions</div>
                        <div className="mt-1 font-semibold text-[var(--store-ink)]">{formatCurrency(data.wallet.totalCommissions)}</div>
                      </div>
                      <div className="agent-metric p-3">
                        <div className="text-[11px] text-[var(--store-muted)]">Reserved</div>
                        <div className="mt-1 font-semibold text-[var(--store-ink)]">{formatCurrency(data.wallet.totalWithdrawalsReserved)}</div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="agent-input"
                        placeholder="Withdraw amount (min 50)"
                        value={withdrawAmount}
                        onChange={(event) => setWithdrawAmount(event.target.value)}
                      />
                      <input
                        className="agent-input"
                        placeholder="Momo name"
                        value={momoName}
                        onChange={(event) => setMomoName(event.target.value)}
                      />
                      <input
                        className="agent-input"
                        placeholder="Momo number"
                        value={momoNumber}
                        onChange={(event) => setMomoNumber(event.target.value)}
                      />
                      <select
                        className="agent-input"
                        value={momoNetwork}
                        onChange={(event) => setMomoNetwork(event.target.value as typeof momoNetwork)}
                      >
                        <option value="mtn">MTN</option>
                        <option value="telecel">Telecel</option>
                        <option value="airteltigo">AirtelTigo</option>
                      </select>
                    </div>

                    <div className="text-xs text-[var(--store-muted)]">Withdrawal fee: 1 GHS · Minimum: 50 GHS</div>

                    <button
                      type="button"
                      onClick={() => withdrawMutation.mutate()}
                      disabled={withdrawMutation.isLoading}
                      className="agent-btn-dark"
                    >
                      {withdrawMutation.isLoading ? "Submitting..." : "Request withdrawal"}
                    </button>
                    {withdrawMutation.isError && (
                      <div className="text-xs text-rose-500">
                        {withdrawMutation.error instanceof Error ? withdrawMutation.error.message : "Unable to request withdrawal"}
                      </div>
                    )}
                  </section>

                  <section id="agent-withdrawals" className="agent-panel p-3 sm:p-4 md:p-6 space-y-4 min-w-0 overflow-hidden">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--store-muted)]">Trail</div>
                      <h2 className="font-sora text-2xl text-[var(--store-ink)] mt-1">Withdrawal history</h2>
                    </div>

                    {data.withdrawals.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[var(--store-border)] px-4 py-10 text-center text-sm text-[var(--store-muted)]">
                        No withdrawals yet. Your payout timeline will light up here.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {data.withdrawals.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-[var(--store-border)] px-3 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[var(--store-ink)]">{formatCurrency(item.amount)}</div>
                              <div className="text-[11px] text-[var(--store-muted)] mt-0.5 break-words">
                                {item.momoNetwork} · {item.momoNumber} · {item.momoName}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${
                                item.status === "SUCCESS"
                                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-400/30"
                                  : item.status === "FAILED"
                                    ? "bg-rose-500/15 text-rose-500 border-rose-400/30"
                                    : "bg-amber-500/15 text-amber-600 border-amber-400/30"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <section id="agent-orders" className="agent-panel p-3 sm:p-4 md:p-6 space-y-4 min-w-0 overflow-hidden">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--store-muted)]">Live feed</div>
                      <h2 className="font-sora text-2xl text-[var(--store-ink)] mt-1">Storefront orders</h2>
                      <p className="text-sm text-[var(--store-muted)] mt-1">Orders placed on your storefront — statuses update automatically.</p>
                    </div>
                    <div className="text-xs text-[var(--store-muted)]">
                      {ordersQuery.isSuccess ? `${ordersQuery.data.length} order(s)` : "—"}
                    </div>
                  </div>

                  {ordersQuery.isLoading && <div className="text-sm text-[var(--store-muted)]">Loading orders...</div>}
                  {ordersQuery.isError && (
                    <div className="text-xs text-rose-500">
                      {ordersQuery.error instanceof Error ? ordersQuery.error.message : "Unable to load orders."}
                    </div>
                  )}

                  {ordersQuery.isSuccess && ordersQuery.data.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[var(--store-border)] px-4 py-10 text-center text-sm text-[var(--store-muted)]">
                      No orders yet. Share your storefront link to start receiving sales.
                    </div>
                  )}

                  {ordersQuery.isSuccess && ordersQuery.data.length > 0 && (
                    <div className="grid gap-3">
                      {ordersQuery.data.map((order) => (
                        <div key={order.id} className="rounded-2xl border border-[var(--store-border)] p-4 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="text-[11px] text-[var(--store-muted)]">Order ID</div>
                              <div className="text-sm font-semibold text-[var(--store-ink)]">#{order.id.slice(0, 8)}</div>
                            </div>
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${
                                orderStatusTone[order.dataStatus || "PENDING"] || orderStatusTone.PENDING
                              }`}
                            >
                              {order.dataStatus || "PENDING"}
                            </span>
                          </div>

                          <div className="grid gap-2 text-xs text-[var(--store-muted)] sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <span>Customer: </span>
                              <span className="font-medium text-[var(--store-ink)]">
                                {order.customer?.name || order.customer?.email || "Guest"}
                              </span>
                            </div>
                            <div>
                              <span>Phone: </span>
                              <span className="font-medium text-[var(--store-ink)]">
                                {order.customer?.phone || order.deliveryInfo.phone || "-"}
                              </span>
                            </div>
                            <div>
                              <span>Network: </span>
                              <span className="font-medium text-[var(--store-ink)]">{humanize(order.deliveryInfo.network)}</span>
                            </div>
                            <div>
                              <span>Amount: </span>
                              <span className="font-medium text-[var(--store-ink)]">{formatCurrency(order.total)}</span>
                            </div>
                            <div>
                              <span>Date: </span>
                              <span className="font-medium text-[var(--store-ink)]">
                                {new Date(order.createdAt).toLocaleDateString("en-GH", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            {order.payment && (
                              <div>
                                <span>Payment: </span>
                                <span className="font-medium text-[var(--store-ink)]">{order.payment.status}</span>
                              </div>
                            )}
                          </div>

                          {order.deliveryInfo.agentMarkup != null && Number(order.deliveryInfo.agentMarkup) > 0 && (
                            <div className="text-[11px] font-medium text-emerald-500 border-t border-[var(--store-border)] pt-2">
                              Markup earned: +{formatCurrency(Number(order.deliveryInfo.agentMarkup))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
