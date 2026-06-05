"use client";

import React from "react";

export default function RightPanel() {
  return (
    <aside className="hidden xl:flex w-72 border-l border-[var(--admin-border)] bg-white/78 backdrop-blur flex-col p-4 gap-4">
      <div className="card p-4 border border-[var(--admin-border)]">
        <div className="text-sm text-slate-500">Notifications</div>
        <div className="mt-2 flex flex-col gap-2 text-sm text-slate-700">
          <div>New order #1024 received</div>
          <div>Paystack webhook verified</div>
          <div>3 products low on stock</div>
        </div>
      </div>
      <div className="card p-4 gradient-purple border border-[var(--admin-border)]">
        <div className="text-sm font-semibold text-slate-900">Upgrade plan</div>
        <p className="text-xs text-slate-700 mt-1">
          Unlock analytics, automation, and priority support for Korelly.
        </p>
        <button className="mt-3 w-full admin-btn justify-center">
          View plans
        </button>
      </div>
    </aside>
  );
}
