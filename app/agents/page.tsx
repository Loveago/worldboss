"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [storefrontName, setStorefrontName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const leaderboardQuery = useQuery<LeaderboardAgent[]>({
    queryKey: ["agents-leaderboard"],
    queryFn: () => apiFetch<LeaderboardAgent[]>("/api/agents/leaderboard"),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ storefrontSlug: string; status: string }>("/api/agents/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storefrontName: storefrontName.trim(),
          contactPhone: contactPhone.trim(),
          whatsappNumber: whatsappNumber.trim(),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] });
    },
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
        <h1 className="font-sora text-3xl text-slate-900">Corelly Agent Hub</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Apply to become a data agent, set your own bundle markup, and earn commission per successful sale.
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
            <h2 className="font-sora text-xl text-slate-900">Apply as an agent</h2>
            <p className="text-sm text-slate-600">Once approved, you get a special storefront link and agent dashboard access.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500">Storefront name</label>
            <input
              className="w-full store-outline px-3 py-2 text-sm"
              value={storefrontName}
              onChange={(event) => setStorefrontName(event.target.value)}
              placeholder="Kwame Data Deals"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Phone number</label>
            <input
              className="w-full store-outline px-3 py-2 text-sm"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="0240000000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500">WhatsApp number</label>
            <input
              className="w-full store-outline px-3 py-2 text-sm"
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              placeholder="0240000000"
            />
          </div>

          {applyMutation.isError && (
            <div className="text-xs text-rose-600">{applyMutation.error instanceof Error ? applyMutation.error.message : "Unable to submit application"}</div>
          )}
          {applyMutation.isSuccess && (
            <div className="text-xs text-emerald-700">Application submitted. You can track status on your agent dashboard.</div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isLoading || !storefrontName.trim() || !contactPhone.trim() || !whatsappNumber.trim()}
              className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm disabled:opacity-60"
            >
              {applyMutation.isLoading ? "Submitting..." : "Submit application"}
            </button>
            <Link href="/agent/dashboard" className="store-outline px-4 py-2 text-sm">
              Open agent dashboard
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
