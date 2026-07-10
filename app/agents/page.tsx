"use client";

import React from "react";
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
  { tier: "Tier 1", range: "0 – 500 sales", tone: "from-slate-400/20 to-slate-500/10 border-slate-400/20", medal: "◇" },
  { tier: "Tier 2", range: "500 – 1,000 sales", tone: "from-sky-400/20 to-cyan-500/10 border-sky-400/25", medal: "◈" },
  { tier: "Tier 3", range: "1,000 – 3,000 sales", tone: "from-violet-400/20 to-fuchsia-500/10 border-violet-400/25", medal: "⬡" },
  { tier: "Tier 4", range: "3,000 – 6,000 sales", tone: "from-amber-400/25 to-orange-500/10 border-amber-400/30", medal: "★" },
];

export default function AgentsPage() {
  const leaderboardQuery = useQuery<LeaderboardAgent[]>({
    queryKey: ["agents-leaderboard"],
    queryFn: () => apiFetch<LeaderboardAgent[]>("/api/agents/leaderboard"),
  });

  const agents = leaderboardQuery.data || [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[var(--store-border)] bg-gradient-to-br from-[#0f0c29] via-[#1a1a4e] to-[#24243e] px-6 py-8 md:px-8 md:py-10 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.4),transparent_42%),radial-gradient(circle_at_85%_70%,rgba(236,72,153,0.25),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="relative z-10 space-y-5 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            Korelly Agent Network
          </div>
          <h1 className="font-sora text-3xl md:text-5xl font-semibold tracking-tight">
            Sell data. Build your pulse. Climb the cosmos.
          </h1>
          <p className="text-sm md:text-base text-indigo-100/80 leading-relaxed max-w-2xl">
            Agents run premium storefronts, set their own markup, and earn commissions on every delivery. Rank up through badge tiers as your sales velocity grows.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/profile" className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_16px_40px_rgba(255,255,255,0.18)]">
              Open agent dashboard
            </Link>
            <Link href="/login" className="rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 backdrop-blur">
              Sign in to apply
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tierRanges.map((tier) => (
          <div
            key={tier.tier}
            className={`rounded-[22px] border bg-gradient-to-br p-4 ${tier.tone}`}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-[var(--store-ink)]">{tier.tier}</div>
              <span className="text-xl opacity-70">{tier.medal}</span>
            </div>
            <div className="mt-2 text-sm text-[var(--store-muted)]">{tier.range}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
        <div className="store-card p-5 md:p-6 space-y-5 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[var(--store-accent)]/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--store-muted)]">Join the fleet</div>
              <h2 className="font-sora text-2xl text-[var(--store-ink)] mt-1">Become an agent</h2>
              <p className="text-sm text-[var(--store-muted)] mt-2 leading-relaxed">
                Applications live in your profile dashboard. Once approved you unlock a branded Data Pulse storefront, markup controls, wallet, and withdrawal tools.
              </p>
            </div>

            <ul className="space-y-2.5 text-sm text-[var(--store-muted)]">
              <li className="flex gap-2">
                <span className="text-[var(--store-accent)]">▸</span>
                Custom storefront link customers can buy from instantly
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--store-accent)]">▸</span>
                Per-bundle markup engine so you set your own margins
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--store-accent)]">▸</span>
                Commission wallet with MoMo withdrawals
              </li>
            </ul>

            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/profile" className="agent-btn-primary inline-flex">
                Open profile dashboard
              </Link>
              <Link href="/login" className="store-outline px-4 py-2 text-sm font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <div className="store-card p-5 md:p-6 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--store-muted)]">Leaderboard</div>
              <h2 className="font-sora text-2xl text-[var(--store-ink)] mt-1">Top agents</h2>
            </div>
            <span className="text-xs text-[var(--store-muted)]">Ranked by sales velocity</span>
          </div>

          {leaderboardQuery.isLoading && <div className="text-sm text-[var(--store-muted)]">Loading agents...</div>}
          {leaderboardQuery.isError && (
            <div className="text-sm text-rose-500">
              {leaderboardQuery.error instanceof Error ? leaderboardQuery.error.message : "Unable to load agents"}
            </div>
          )}
          {!leaderboardQuery.isLoading && !leaderboardQuery.isError && agents.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--store-border)] px-4 py-10 text-center text-sm text-[var(--store-muted)]">
              No approved agents yet. Be the first to light up the board.
            </div>
          )}

          <div className="space-y-2.5">
            {agents.map((agent, index) => (
              <div
                key={agent.userId}
                className="agent-leader-row group px-3.5 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="agent-leader-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white">
                    {index < 3 ? ["🥇", "🥈", "🥉"][index] : agent.storefrontName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--store-ink)] truncate">{agent.storefrontName}</div>
                    <div className="text-xs text-[var(--store-muted)] mt-0.5">
                      {agent.salesCount} sales · {formatCurrency(agent.totalCommissions)} earned
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="store-pill px-2.5 py-1 text-[10px] font-semibold">
                    T{agent.tier} · {agent.badge}
                  </span>
                  <Link
                    href={`/agents/storefront/${agent.storefrontSlug}`}
                    className="rounded-full border border-[var(--store-border)] px-3 py-1.5 text-xs font-semibold text-[var(--store-accent)] transition group-hover:bg-[var(--store-accent)] group-hover:text-white group-hover:border-transparent"
                  >
                    View store
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
