"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

type LeaderboardAgent = {
  userId: string;
  storefrontName: string;
  storefrontSlug: string;
  badge: string;
  tier: number;
  salesCount: number;
  totalCommissions: number;
};

export default function AgentsPage() {
  const leaderboardQuery = useQuery<LeaderboardAgent[]>({
    queryKey: ["agents-leaderboard"],
    queryFn: () => apiFetch<LeaderboardAgent[]>("/api/agents/leaderboard"),
  });

  const tierRanges = [
    { tier: "Tier 1", range: "0 - 500 sales" },
    { tier: "Tier 2", range: "500 - 1000 sales" },
    { tier: "Tier 3", range: "1000 - 3000 sales" },
    { tier: "Tier 4", range: "3000 - 6000 sales" },
  ];

  return (
    <div className="space-y-6">
      <section className="store-hero p-6 md:p-8 space-y-3">
        <h1 className="font-sora text-3xl text-slate-900">Korelly Agent Hub</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Top-performing data agents and badge tiers across the Korelly network.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {tierRanges.map((tier) => (
            <div key={tier.tier} className="store-card p-3 bg-white/80">
              <div className="text-sm font-semibold text-slate-900">{tier.tier}</div>
              <div className="text-xs text-slate-500 mt-1">{tier.range}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_1.3fr]">
        <div className="store-card p-5 space-y-4">
          <div>
            <h2 className="font-sora text-xl text-slate-900">Become an agent</h2>
            <p className="text-sm text-slate-600">Agent applications now live in your user dashboard for signed-in users.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/profile" className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm">
              Open profile dashboard
            </Link>
            <Link href="/login" className="store-outline px-4 py-2 text-sm">
              Sign in
            </Link>
          </div>
        </div>

        <div className="store-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sora text-xl text-slate-900">Top agents</h2>
            <span className="text-xs text-slate-500">Tier badges</span>
          </div>

          {leaderboardQuery.isLoading && <div className="text-sm text-slate-500">Loading agents...</div>}
          {leaderboardQuery.isError && (
            <div className="text-sm text-rose-600">{leaderboardQuery.error instanceof Error ? leaderboardQuery.error.message : "Unable to load agents"}</div>
          )}
          {!leaderboardQuery.isLoading && !leaderboardQuery.isError && (leaderboardQuery.data || []).length === 0 && (
            <div className="text-sm text-slate-500">No approved agents yet.</div>
          )}

          <div className="space-y-2">
            {(leaderboardQuery.data || []).map((agent) => (
              <div key={agent.userId} className="store-outline rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{agent.storefrontName}</div>
                  <div className="text-xs text-slate-500">{agent.salesCount} sales</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="store-pill px-2 py-0.5 text-[10px]">{agent.badge}</span>
                  <Link href={`/agents/storefront/${agent.storefrontSlug}`} className="text-xs text-[var(--store-accent)]">
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
