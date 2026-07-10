"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type LeaderboardAgent = {
  userId: string;
  storefrontName: string;
  storefrontSlug: string;
  badge: string;
  tier: number;
  salesCount: number;
  totalCommissions: number;
};

const tierRanges = [
  {
    tier: 1,
    label: "Tier 1",
    range: "0 – 500 sales",
    medal: "◇",
    tone: "from-slate-100 via-white to-slate-50 border-slate-200",
    chip: "bg-slate-100 text-slate-700",
  },
  {
    tier: 2,
    label: "Tier 2",
    range: "500 – 1,000 sales",
    medal: "◈",
    tone: "from-sky-50 via-white to-cyan-50 border-sky-200",
    chip: "bg-sky-100 text-sky-700",
  },
  {
    tier: 3,
    label: "Tier 3",
    range: "1,000 – 3,000 sales",
    medal: "⬡",
    tone: "from-violet-50 via-white to-fuchsia-50 border-violet-200",
    chip: "bg-violet-100 text-violet-700",
  },
  {
    tier: 4,
    label: "Tier 4",
    range: "3,000 – 6,000 sales",
    medal: "★",
    tone: "from-amber-50 via-white to-orange-50 border-amber-200",
    chip: "bg-amber-100 text-amber-700",
  },
];

const perks = [
  {
    icon: "🔗",
    title: "Branded storefront",
    copy: "Share a clean Data Pulse link customers can buy from instantly.",
  },
  {
    icon: "📈",
    title: "Your markup",
    copy: "Set per-bundle margins and keep commissions on every delivery.",
  },
  {
    icon: "👛",
    title: "Wallet + MoMo",
    copy: "Track earnings and withdraw to mobile money when you need cash.",
  },
  {
    icon: "🏅",
    title: "Rank climb",
    copy: "Badge tiers unlock as sales velocity grows across the network.",
  },
];

const steps = [
  { n: "01", title: "Apply", copy: "Submit storefront details from your profile." },
  { n: "02", title: "Get approved", copy: "Admin reviews and unlocks your agent tools." },
  { n: "03", title: "Price & share", copy: "Set markups and send your storefront link." },
  { n: "04", title: "Earn & withdraw", copy: "Commissions land in wallet for MoMo payouts." },
];

export default function AgentsPage() {
  const leaderboardQuery = useQuery<LeaderboardAgent[]>({
    queryKey: ["agents-leaderboard"],
    queryFn: () => apiFetch<LeaderboardAgent[]>("/api/agents/leaderboard"),
  });

  const agents = useMemo(() => leaderboardQuery.data ?? [], [leaderboardQuery.data]);
  const totalSales = useMemo(() => agents.reduce((sum, a) => sum + (a.salesCount || 0), 0), [agents]);
  const totalCommissions = useMemo(
    () => agents.reduce((sum, a) => sum + Number(a.totalCommissions || 0), 0),
    [agents]
  );
  const topAgent = agents[0] ?? null;

  return (
    <div className="space-y-5 md:space-y-6 min-w-0 max-w-full overflow-x-clip">
      {/* Hero */}
      <section className="kb-cosmos-panel p-4 sm:p-5 md:p-8 overflow-hidden">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-3.5 md:space-y-5 min-w-0">
            <span className="kb-chip bg-white/10 text-white border border-white/15 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              Korelly Agent Network
            </span>
            <h1 className="font-sora text-[1.7rem] leading-[1.08] sm:text-3xl md:text-4xl lg:text-5xl text-white font-semibold tracking-tight">
              Sell data.
              <br />
              Build your pulse.
              <br />
              <span className="bg-gradient-to-r from-indigo-200 via-fuchsia-200 to-amber-100 bg-clip-text text-transparent">
                Climb the cosmos.
              </span>
            </h1>
            <p className="text-[13px] sm:text-sm md:text-base text-white/70 max-w-xl leading-relaxed">
              Run a premium storefront, set your own markup, and earn commissions on every successful delivery.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2">
              <Link href="/profile" className="store-btn-primary px-4 py-2.5 text-sm text-center">
                Open agent dashboard
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-center text-white hover:bg-white/15 transition"
              >
                Sign in to apply
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 min-w-0">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 sm:p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-wide text-white/55">Live agents</div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold text-white">
                {leaderboardQuery.isLoading ? "…" : agents.length}
              </div>
              <div className="text-[11px] text-white/50 mt-0.5">On the board</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 sm:p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-wide text-white/55">Network sales</div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold text-white">
                {leaderboardQuery.isLoading ? "…" : totalSales}
              </div>
              <div className="text-[11px] text-white/50 mt-0.5">All-time volume</div>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/15 bg-gradient-to-br from-white/15 to-white/5 p-3 sm:p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-wide text-white/55">Top pulse</div>
              <div className="mt-1 text-sm sm:text-base font-semibold text-white truncate">
                {topAgent ? topAgent.storefrontName : "Be the first"}
              </div>
              <div className="text-[11px] text-white/55 mt-0.5">
                {topAgent
                  ? `${topAgent.salesCount} sales · T${topAgent.tier} · ${topAgent.badge}`
                  : "Apply and light up the leaderboard"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <div className="store-metric px-3 py-3 md:px-4 md:py-4">
          <div className="text-[10px] md:text-[11px] uppercase tracking-wide text-slate-500">Agents</div>
          <div className="mt-0.5 md:mt-1 text-lg md:text-2xl font-semibold text-slate-900">
            {leaderboardQuery.isLoading ? "—" : agents.length}
          </div>
          <div className="text-[10px] md:text-xs text-slate-500">Approved storefronts</div>
        </div>
        <div className="store-metric px-3 py-3 md:px-4 md:py-4">
          <div className="text-[10px] md:text-[11px] uppercase tracking-wide text-slate-500">Sales</div>
          <div className="mt-0.5 md:mt-1 text-lg md:text-2xl font-semibold text-slate-900">
            {leaderboardQuery.isLoading ? "—" : totalSales}
          </div>
          <div className="text-[10px] md:text-xs text-slate-500">Network total</div>
        </div>
        <div className="store-metric px-3 py-3 md:px-4 md:py-4">
          <div className="text-[10px] md:text-[11px] uppercase tracking-wide text-slate-500">Commissions</div>
          <div className="mt-0.5 md:mt-1 text-lg md:text-2xl font-semibold text-slate-900 truncate">
            {leaderboardQuery.isLoading ? "—" : formatCurrency(totalCommissions)}
          </div>
          <div className="text-[10px] md:text-xs text-slate-500">Earned on board</div>
        </div>
        <div className="store-metric px-3 py-3 md:px-4 md:py-4">
          <div className="text-[10px] md:text-[11px] uppercase tracking-wide text-slate-500">Tiers</div>
          <div className="mt-0.5 md:mt-1 text-lg md:text-2xl font-semibold text-slate-900">4</div>
          <div className="text-[10px] md:text-xs text-slate-500">Badge ladder</div>
        </div>
      </section>

      {/* Badge ladder */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2 px-0.5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Badge ladder</div>
            <h2 className="font-sora text-lg md:text-xl text-slate-900 mt-0.5">Climb the ranks</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 md:gap-3">
          {tierRanges.map((tier) => (
            <div
              key={tier.label}
              className={`rounded-2xl border bg-gradient-to-br p-3.5 md:p-4 store-tile-lift min-w-0 ${tier.tone}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tier.chip}`}>{tier.label}</span>
                <span className="text-lg opacity-70" aria-hidden>
                  {tier.medal}
                </span>
              </div>
              <div className="mt-2.5 text-sm font-semibold text-slate-900">Tier {tier.tier}</div>
              <div className="text-xs text-slate-600 mt-0.5 leading-snug">{tier.range}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works + perks */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="store-card p-4 md:p-6 space-y-4 min-w-0">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Playbook</div>
            <h2 className="font-sora text-lg md:text-xl text-slate-900 mt-0.5">How agents launch</h2>
          </div>
          <div className="space-y-2.5">
            {steps.map((step) => (
              <div
                key={step.n}
                className="flex gap-3 rounded-2xl border border-[var(--store-border)] bg-white/80 px-3 py-2.5 md:px-4 md:py-3"
              >
                <div className="h-9 w-9 shrink-0 rounded-xl bg-[var(--store-accent-soft)] text-[var(--store-accent)] text-xs font-bold inline-flex items-center justify-center">
                  {step.n}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.copy}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="store-card p-4 md:p-6 space-y-4 relative overflow-hidden min-w-0">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--store-accent)]/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Join the fleet</div>
              <h2 className="font-sora text-lg md:text-xl text-slate-900 mt-0.5">Why agents win</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Apply from your profile. Once approved you unlock a branded storefront, markup engine, wallet, and withdrawals.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {perks.map((perk) => (
                <div
                  key={perk.title}
                  className="rounded-2xl border border-[var(--store-border)] bg-white/85 px-3 py-3 min-w-0"
                >
                  <div className="text-lg" aria-hidden>
                    {perk.icon}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-1.5">{perk.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{perk.copy}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Link href="/profile" className="store-btn-primary px-4 py-2.5 text-sm text-center">
                Apply from profile
              </Link>
              <Link href="/login" className="store-outline px-4 py-2.5 text-sm text-center">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="store-card p-4 md:p-6 space-y-4 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Leaderboard</div>
            <h2 className="font-sora text-lg md:text-xl text-slate-900 mt-0.5">Top agents</h2>
          </div>
          <span className="text-xs text-slate-500">Ranked by sales velocity</span>
        </div>

        {leaderboardQuery.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[72px] rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {leaderboardQuery.isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {leaderboardQuery.error instanceof Error ? leaderboardQuery.error.message : "Unable to load agents"}
          </div>
        )}

        {!leaderboardQuery.isLoading && !leaderboardQuery.isError && agents.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--store-border)] px-4 py-10 text-center text-sm text-slate-500">
            No approved agents yet. Be the first to light up the board.
          </div>
        )}

        {!leaderboardQuery.isLoading && !leaderboardQuery.isError && agents.length > 0 && (
          <div className="space-y-2">
            {agents.map((agent, index) => {
              const rank = index + 1;
              const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
              return (
                <div
                  key={agent.userId}
                  className="agent-leader-row group rounded-2xl border border-[var(--store-border)] bg-white/90 px-3 py-3 md:px-4 min-w-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="agent-leader-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white">
                      {medal || agent.storefrontName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400">#{rank}</span>
                        <div className="font-semibold text-slate-900 truncate max-w-full">{agent.storefrontName}</div>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {agent.salesCount} sales · {formatCurrency(agent.totalCommissions)} earned
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="store-pill px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                          T{agent.tier} · {agent.badge}
                        </span>
                        <Link
                          href={`/agents/storefront/${agent.storefrontSlug}`}
                          className="rounded-full border border-[var(--store-border)] px-2.5 py-1 text-xs font-semibold text-[var(--store-accent)] transition hover:bg-[var(--store-accent)] hover:text-white hover:border-transparent whitespace-nowrap"
                        >
                          View store
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="kb-cosmos-panel p-4 sm:p-5 md:p-7">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="space-y-1.5 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">Ready when you are</div>
            <h2 className="font-sora text-lg md:text-2xl text-white">Launch your Data Pulse storefront</h2>
            <p className="text-sm text-white/65 max-w-xl">
              Apply in profile, get approved, share your link, and start earning on every delivery.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0 w-full sm:w-auto">
            <Link href="/profile" className="store-btn-primary px-4 py-2.5 text-sm text-center">
              Go to profile
            </Link>
            <Link
              href="/data"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-center text-white hover:bg-white/15 transition"
            >
              Browse data
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
