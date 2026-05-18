"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type NetworkFilter = "all" | "mtn" | "telecel" | "airteltigo";
type BundleSortKey = "volume" | "basePrice" | "finalPrice" | "markup";

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

const networkLabel: Record<Exclude<NetworkFilter, "all">, string> = {
  mtn: "MTN",
  telecel: "Telecel",
  airteltigo: "AirtelTigo",
};

const parseVolumeRank = (value: string) => {
  const numeric = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
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
  const [activeSection, setActiveSection] = useState<"overview" | "storefront" | "pricing" | "wallet" | "withdrawals">("overview");
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>("all");
  const [pricingSearch, setPricingSearch] = useState("");
  const [bundleSortKey, setBundleSortKey] = useState<BundleSortKey>("volume");
  const [bundleSortDirection, setBundleSortDirection] = useState<"asc" | "desc">("asc");

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

  const jumpTo = (section: "overview" | "storefront" | "pricing" | "wallet" | "withdrawals") => {
    setActiveSection(section);
    const target = document.getElementById(`agent-${section}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      <section id="agent-overview" className="store-glass p-5 md:p-7 space-y-4 relative overflow-hidden store-fade-up">
        <div className="absolute -top-20 right-6 h-36 w-36 rounded-full bg-indigo-100/70 blur-3xl store-glow" />
        <div className="absolute -bottom-24 left-2 h-44 w-44 rounded-full bg-sky-100/70 blur-3xl store-glow" />
        <div className="relative z-10 space-y-2">
          <h1 className="font-sora text-3xl text-slate-900">Agent Dashboard</h1>
          <p className="text-sm text-slate-600">Manage your storefront, pricing markup, wallet, and withdrawals from one modern workspace.</p>
        </div>
        <div className="relative z-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="store-outline store-tile-lift rounded-2xl px-4 py-3 bg-white/80">
            <div className="text-[11px] text-slate-500">Sales</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{data?.stats.salesCount ?? 0}</div>
          </div>
          <div className="store-outline store-tile-lift rounded-2xl px-4 py-3 bg-white/80">
            <div className="text-[11px] text-slate-500">Agent badge</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{data?.stats.badge || "-"}</div>
          </div>
          <div className="store-outline store-tile-lift rounded-2xl px-4 py-3 bg-white/80">
            <div className="text-[11px] text-slate-500">Wallet</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(data?.wallet.balance ?? 0)}</div>
          </div>
          <div className="store-outline store-tile-lift rounded-2xl px-4 py-3 bg-white/80">
            <div className="text-[11px] text-slate-500">Storefront status</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{data?.profile?.status || "Not applied"}</div>
          </div>
        </div>
      </section>

      {dashboardQuery.isLoading && <div className="store-card p-4 text-sm text-slate-500">Loading dashboard...</div>}
      {dashboardQuery.isError && (
        <div className="store-card p-4 text-sm text-rose-600">{dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Unable to load dashboard"}</div>
      )}

      {data && (
        <>
          {!data.hasApplication && (
            <div className="store-card p-5 text-sm text-slate-600">
              You have not applied as an agent yet. <Link href="/agents" className="text-[var(--store-accent)]">Apply now</Link>
            </div>
          )}

          {data.hasApplication && !data.isApproved && (
            <div className="store-card p-5 text-sm text-slate-600">
              Application status: <span className="font-semibold">{data.profile?.status}</span>. You will gain storefront controls once approved by admin.
            </div>
          )}

          {data.isApproved && data.profile && (
            <>
              <section className="store-glass p-2.5 md:p-3.5 store-fade-up" style={{ animationDelay: "80ms" }}>
                <div className="dashboard-menu-row">
                  {([
                    ["overview", "Overview"],
                    ["storefront", "Storefront"],
                    ["pricing", "Bundle pricing"],
                    ["wallet", "Wallet"],
                    ["withdrawals", "Withdrawals"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => jumpTo(key)}
                      className={`dashboard-menu-btn rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        activeSection === key
                          ? "bg-[var(--store-accent)] text-white shadow-[0_10px_20px_rgba(91,92,230,0.28)]"
                          : "store-outline text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
                <div className="space-y-6">
                  <section id="agent-storefront" className="store-card p-4 md:p-5 space-y-4 store-fade-up" style={{ animationDelay: "130ms" }}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-sora text-xl text-slate-900">Storefront settings</h2>
                    <span className="store-pill px-2 py-0.5 text-[10px]">{data.stats.badge}</span>
                  </div>
                  <div className="text-xs text-slate-500">Sales: {data.stats.salesCount}</div>
                  {data.storefrontLink && (
                    <div className="store-outline px-3 py-2 text-xs">
                      Store link: <Link href={data.storefrontLink} className="text-[var(--store-accent)]">{data.storefrontLink}</Link>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Storefront name</label>
                    <input className="w-full store-outline px-3 py-2 text-sm" value={storefrontName} onChange={(event) => setStorefrontName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Phone number</label>
                    <input className="w-full store-outline px-3 py-2 text-sm" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">WhatsApp number</label>
                    <input className="w-full store-outline px-3 py-2 text-sm" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => saveStoreMutation.mutate()}
                    disabled={saveStoreMutation.isLoading}
                    className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {saveStoreMutation.isLoading ? "Saving..." : "Save storefront"}
                  </button>
                  </section>

                  <section id="agent-wallet" className="store-card p-4 md:p-5 space-y-3 store-fade-up" style={{ animationDelay: "180ms" }}>
                  <h2 className="font-sora text-xl text-slate-900">Agent wallet</h2>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="store-outline store-tile-lift rounded-2xl px-3 py-2">
                      <div className="text-[11px] text-slate-500">Available</div>
                      <div className="font-semibold text-slate-900">{formatCurrency(data.wallet.balance)}</div>
                    </div>
                    <div className="store-outline store-tile-lift rounded-2xl px-3 py-2">
                      <div className="text-[11px] text-slate-500">Commissions</div>
                      <div className="font-semibold text-slate-900">{formatCurrency(data.wallet.totalCommissions)}</div>
                    </div>
                    <div className="store-outline store-tile-lift rounded-2xl px-3 py-2">
                      <div className="text-[11px] text-slate-500">Reserved</div>
                      <div className="font-semibold text-slate-900">{formatCurrency(data.wallet.totalWithdrawalsReserved)}</div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className="store-outline px-3 py-2 text-sm" placeholder="Withdraw amount (min 50)" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} />
                    <input className="store-outline px-3 py-2 text-sm" placeholder="Momo name" value={momoName} onChange={(event) => setMomoName(event.target.value)} />
                    <input className="store-outline px-3 py-2 text-sm" placeholder="Momo number" value={momoNumber} onChange={(event) => setMomoNumber(event.target.value)} />
                    <select className="store-outline px-3 py-2 text-sm" value={momoNetwork} onChange={(event) => setMomoNetwork(event.target.value as typeof momoNetwork)}>
                      <option value="mtn">MTN</option>
                      <option value="telecel">Telecel</option>
                      <option value="airteltigo">AirtelTigo</option>
                    </select>
                  </div>
                  <div className="text-xs text-slate-500">Withdrawal fee: 1 GHS. Minimum withdrawal: 50 GHS.</div>
                  <button
                    type="button"
                    onClick={() => withdrawMutation.mutate()}
                    disabled={withdrawMutation.isLoading}
                    className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {withdrawMutation.isLoading ? "Submitting..." : "Request withdrawal"}
                  </button>
                  {withdrawMutation.isError && (
                    <div className="text-xs text-rose-600">{withdrawMutation.error instanceof Error ? withdrawMutation.error.message : "Unable to request withdrawal"}</div>
                  )}
                  </section>
                </div>

                <div className="space-y-6">
                  <section id="agent-pricing" className="store-card p-4 md:p-5 space-y-3 store-fade-up" style={{ animationDelay: "210ms" }}>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-sora text-xl text-slate-900">Bundle markup pricing</h2>
                      <span className="text-xs text-slate-500">{pricingRows.length} bundle(s)</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="space-y-1.5">
                        <span className="text-[11px] text-slate-500">Filter network</span>
                        <select
                          value={networkFilter}
                          onChange={(event) => setNetworkFilter(event.target.value as NetworkFilter)}
                          className="w-full store-outline px-3 py-2 text-sm"
                        >
                          <option value="all">All networks</option>
                          <option value="mtn">MTN</option>
                          <option value="telecel">Telecel</option>
                          <option value="airteltigo">AirtelTigo</option>
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-[11px] text-slate-500">Search bundle</span>
                        <input
                          value={pricingSearch}
                          onChange={(event) => setPricingSearch(event.target.value)}
                          className="w-full store-outline px-3 py-2 text-sm"
                          placeholder="e.g. 5GB, weekly"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-[11px] text-slate-500">Sort by</span>
                        <select
                          value={bundleSortKey}
                          onChange={(event) => setBundleSortKey(event.target.value as BundleSortKey)}
                          className="w-full store-outline px-3 py-2 text-sm"
                        >
                          <option value="volume">Volume</option>
                          <option value="basePrice">Base price</option>
                          <option value="markup">Markup</option>
                          <option value="finalPrice">Final price</option>
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-[11px] text-slate-500">Order</span>
                        <select
                          value={bundleSortDirection}
                          onChange={(event) => setBundleSortDirection(event.target.value as "asc" | "desc")}
                          className="w-full store-outline px-3 py-2 text-sm"
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </label>
                    </div>

                    {pricingRows.length === 0 ? (
                      <div className="store-outline rounded-2xl px-4 py-3 text-sm text-slate-500">No bundles match your current filters.</div>
                    ) : (
                      <div className="space-y-2">
                        {pricingRows.map((bundle) => (
                          <div key={bundle.id} className="store-outline store-tile-lift rounded-2xl px-3 py-2.5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-medium text-slate-900">{bundle.volume}</div>
                                <span className="store-pill px-2 py-0.5 text-[10px]">{networkLabel[bundle.network]}</span>
                              </div>
                              <div className="text-[11px] text-slate-500">{bundle.name} · {bundle.validity}</div>
                              <div className="text-[11px] text-slate-500">
                                Base: {formatCurrency(bundle.basePrice)} · Final: {formatCurrency(bundle.liveFinalPrice)}
                              </div>
                            </div>
                            <label className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">Markup</span>
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
                                className="store-outline px-2 py-1 text-sm w-[100px]"
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
                      className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {saveStoreMutation.isLoading ? "Saving pricing..." : "Save pricing changes"}
                    </button>
                  </section>

                  <section id="agent-withdrawals" className="store-card p-4 md:p-5 space-y-2 store-fade-up" style={{ animationDelay: "260ms" }}>
                    <h2 className="font-sora text-xl text-slate-900">Withdrawal history</h2>
                    {data.withdrawals.length === 0 ? (
                      <div className="text-sm text-slate-500">No withdrawals yet.</div>
                    ) : (
                      data.withdrawals.map((item) => (
                        <div key={item.id} className="store-outline store-tile-lift rounded-xl px-3 py-2 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{formatCurrency(item.amount)}</div>
                            <div className="text-[11px] text-slate-500">{item.momoNetwork} · {item.momoNumber}</div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full ${
                              item.status === "SUCCESS"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.status === "FAILED"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))
                    )}
                  </section>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
