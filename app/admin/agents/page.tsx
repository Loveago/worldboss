"use client";

import React from "react";
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
  appliedAt: string;
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

  const applicationsQuery = useQuery<Application[]>({
    queryKey: ["admin-agent-applications"],
    queryFn: () => apiFetch<Application[]>("/api/admin/agents"),
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

  const apps = applicationsQuery.data || [];
  const withdrawals = withdrawalsQuery.data || [];

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
