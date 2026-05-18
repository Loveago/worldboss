"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GridLayout from "../../(templates)/GridLayout";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type Application = {
  userId: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  storefrontName: string;
  storefrontSlug: string;
  contactPhone: string;
  whatsappNumber: string;
  adminBundlePrices?: Record<string, number>;
  appliedAt: string;
};

type DataBundle = {
  id: string;
  network: "mtn" | "telecel" | "airteltigo";
  name: string;
  volume: string;
  validity: string;
  price: number | string;
};

type Withdrawal = {
  id: string;
  amount: number;
  status: "INITIATED" | "SUCCESS" | "FAILED";
  createdAt: string;
  user: { id: string; name: string; email: string };
  momoName: string;
  momoNumber: string;
  momoNetwork: string;
  netAmount: number;
  fee: number;
};

export default function AdminAgentsPage() {
  const queryClient = useQueryClient();
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, Record<string, string>>>({});

  const applicationsQuery = useQuery<Application[]>({
    queryKey: ["admin-agent-applications"],
    queryFn: () => apiFetch<Application[]>("/api/admin/agents"),
  });

  const bundlesQuery = useQuery<DataBundle[]>({
    queryKey: ["admin-data-bundles"],
    queryFn: () => apiFetch<DataBundle[]>("/api/data/bundles"),
  });

  const withdrawalsQuery = useQuery<Withdrawal[]>({
    queryKey: ["admin-agent-withdrawals"],
    queryFn: () => apiFetch<Withdrawal[]>("/api/admin/agent-withdrawals"),
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { userId: string; action: "APPROVE" | "REJECT" }) =>
      apiFetch<{ reviewed: boolean }>("/api/admin/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-agent-applications"] }),
  });

  const withdrawalMutation = useMutation({
    mutationFn: (payload: { id: string; action: "PROCESS" | "REJECT" }) =>
      apiFetch<{ updated: boolean }>(`/api/admin/agent-withdrawals/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: payload.action }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-agent-withdrawals"] }),
  });

  const savePricingMutation = useMutation({
    mutationFn: (payload: { userId: string; bundlePrices: Record<string, number | null> }) =>
      apiFetch<{ updated: boolean }>("/api/admin/agents/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-agent-applications"] }),
  });

  const apps = applicationsQuery.data || [];
  const withdrawals = withdrawalsQuery.data || [];
  const bundles = bundlesQuery.data || [];

  const approvedApps = useMemo(() => apps.filter((app) => app.status === "APPROVED"), [apps]);

  useEffect(() => {
    if (approvedApps.length === 0 || bundles.length === 0) return;

    setPricingDrafts((current) => {
      const next = { ...current };
      for (const app of approvedApps) {
        if (next[app.userId]) continue;
        const seed: Record<string, string> = {};
        for (const bundle of bundles) {
          const existing = app.adminBundlePrices?.[bundle.id];
          seed[bundle.id] = typeof existing === "number" ? String(existing) : "";
        }
        next[app.userId] = seed;
      }
      return next;
    });
  }, [approvedApps, bundles]);

  const setDraft = (userId: string, bundleId: string, value: string) => {
    setPricingDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] || {}),
        [bundleId]: value,
      },
    }));
  };

  const saveAgentPricing = (userId: string) => {
    const draft = pricingDrafts[userId] || {};
    const payload = Object.entries(draft).reduce<Record<string, number | null>>((acc, [bundleId, raw]) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        acc[bundleId] = null;
        return acc;
      }
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric) && numeric > 0) {
        acc[bundleId] = numeric;
      }
      return acc;
    }, {});

    savePricingMutation.mutate({ userId, bundlePrices: payload });
  };

  return (
    <GridLayout title="Agents" actions={<div className="text-xs text-slate-500">{apps.length} applications</div>}>
      <section className="card p-5 bg-white space-y-3 lg:col-span-4">
        <div className="text-base font-semibold text-slate-900">Agent applications</div>
        {applicationsQuery.isLoading ? (
          <div className="text-sm text-slate-500">Loading applications...</div>
        ) : apps.length === 0 ? (
          <div className="text-sm text-slate-500">No applications yet.</div>
        ) : (
          <div className="space-y-2">
            {apps.map((item) => (
              <div key={item.userId} className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{item.storefrontName}</div>
                  <div className="text-xs text-slate-500">{item.name} · {item.email} · {item.storefrontSlug}</div>
                  <div className="text-xs text-slate-500">Phone: {item.contactPhone} · WhatsApp: {item.whatsappNumber}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-700">{item.status}</span>
                  <button
                    type="button"
                    onClick={() => reviewMutation.mutate({ userId: item.userId, action: "APPROVE" })}
                    className="text-xs px-3 py-1 rounded-lg border border-emerald-200 text-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewMutation.mutate({ userId: item.userId, action: "REJECT" })}
                    className="text-xs px-3 py-1 rounded-lg border border-rose-200 text-rose-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 bg-white space-y-3 lg:col-span-4">
        <div className="text-base font-semibold text-slate-900">Agent-specific base pricing</div>
        <p className="text-xs text-slate-500">
          Set per-agent bundle base prices. Leave empty to use the normal site price fallback.
        </p>

        {bundlesQuery.isLoading || applicationsQuery.isLoading ? (
          <div className="text-sm text-slate-500">Loading pricing controls...</div>
        ) : approvedApps.length === 0 ? (
          <div className="text-sm text-slate-500">No approved agents yet.</div>
        ) : (
          <div className="space-y-4">
            {approvedApps.map((app) => (
              <div key={`pricing-${app.userId}`} className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{app.storefrontName}</div>
                    <div className="text-xs text-slate-500">{app.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveAgentPricing(app.userId)}
                    disabled={savePricingMutation.isLoading}
                    className="text-xs px-3 py-1 rounded-lg border border-indigo-200 text-indigo-700"
                  >
                    {savePricingMutation.isLoading ? "Saving..." : "Save pricing"}
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {bundles.map((bundle) => (
                    <label key={`${app.userId}-${bundle.id}`} className="rounded-lg border border-slate-100 px-2.5 py-2 block">
                      <div className="text-xs text-slate-900 font-medium">
                        {bundle.network.toUpperCase()} · {bundle.volume}
                      </div>
                      <div className="text-[11px] text-slate-500">Default: {formatCurrency(Number(bundle.price))}</div>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={pricingDrafts[app.userId]?.[bundle.id] || ""}
                        onChange={(event) => setDraft(app.userId, bundle.id, event.target.value)}
                        placeholder="Use default"
                        className="mt-1.5 w-full border border-slate-200 rounded-md px-2 py-1 text-xs"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 bg-white space-y-3 lg:col-span-4">
        <div className="text-base font-semibold text-slate-900">Agent withdrawal processing</div>
        {withdrawalsQuery.isLoading ? (
          <div className="text-sm text-slate-500">Loading withdrawals...</div>
        ) : withdrawals.length === 0 ? (
          <div className="text-sm text-slate-500">No withdrawal requests yet.</div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{item.user?.name || item.user?.email}</div>
                  <div className="text-xs text-slate-500">
                    Gross: {formatCurrency(item.amount)} · Net: {formatCurrency(item.netAmount)} · Fee: {formatCurrency(item.fee)}
                  </div>
                  <div className="text-xs text-slate-500">{item.momoNetwork} · {item.momoName} · {item.momoNumber}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-700">{item.status}</span>
                  <button
                    type="button"
                    onClick={() => withdrawalMutation.mutate({ id: item.id, action: "PROCESS" })}
                    className="text-xs px-3 py-1 rounded-lg border border-emerald-200 text-emerald-700"
                  >
                    Mark processed
                  </button>
                  <button
                    type="button"
                    onClick={() => withdrawalMutation.mutate({ id: item.id, action: "REJECT" })}
                    className="text-xs px-3 py-1 rounded-lg border border-rose-200 text-rose-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </GridLayout>
  );
}
