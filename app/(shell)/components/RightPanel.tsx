"use client";

import React from "react";

export default function RightPanel() {
  return (
    <aside className="admin-right-panel hidden xl:flex w-72 flex-col p-4 gap-4">
      <div className="card p-4 border border-[var(--admin-border)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Live pulse</div>
          <span className="admin-pill px-2 py-0.5 text-[10px]">Now</span>
        </div>
        <div className="space-y-2.5 text-sm text-slate-700">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-accent-soft)] px-3 py-2">
            New order #1024 received
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] px-3 py-2">Paystack webhook verified</div>
          <div className="rounded-xl border border-[var(--admin-border)] px-3 py-2">3 products low on stock</div>
        </div>
      </div>

      <div className="admin-hero p-4">
        <div className="relative z-10 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/60">Upgrade</div>
          <div className="text-sm font-semibold text-white">Unlock automation</div>
          <p className="text-xs text-white/70 leading-relaxed">
            Analytics, agent ops, and priority support for Korelly.
          </p>
          <button className="mt-1 w-full rounded-full bg-white/95 text-indigo-700 px-3 py-2 text-xs font-semibold">
            View plans
          </button>
        </div>
      </div>
    </aside>
  );
}
