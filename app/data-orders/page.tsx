"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type DataOrderStatus = "PLACED" | "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

type DataOrder = {
  id: string;
  total: number;
  status: string;
  dataStatus: DataOrderStatus | null;
  createdAt: string;
  deliveryInfo: {
    network?: string | null;
    bundleId?: string | null;
    phone?: string | null;
    agentSlug?: string | null;
  };
  payment: {
    reference: string;
    status: string;
  } | null;
};

const dataStatusTone: Record<DataOrderStatus, string> = {
  PLACED: "bg-blue-100 text-blue-700",
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const humanize = (value?: string | null) => {
  if (!value) return "-";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function DataOrdersPage() {
  const ordersQuery = useQuery<DataOrder[]>({
    queryKey: ["data-orders"],
    queryFn: () => apiFetch<DataOrder[]>("/api/data-orders"),
    refetchInterval: (data) => {
      const orders = data ?? [];
      const hasActiveOrder = orders.some((order: DataOrder) => order.dataStatus !== "DELIVERED" && order.dataStatus !== "FAILED");
      return hasActiveOrder ? 5000 : 15000;
    },
    refetchIntervalInBackground: true,
  });

  const orders = ordersQuery.data ?? [];
  const errorMessage = ordersQuery.isError
    ? ordersQuery.error instanceof Error
      ? ordersQuery.error.message
      : "Unable to load data orders right now."
    : null;
  const isUnauthorized = errorMessage?.toLowerCase().includes("unauthorized");

  const deliveredCount = orders.filter((o) => o.dataStatus === "DELIVERED").length;
  const pendingCount = orders.filter((o) => o.dataStatus !== "DELIVERED" && o.dataStatus !== "FAILED").length;
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  return (
    <div className="space-y-6">
      <section className="kb-cosmos-panel p-5 md:p-7">
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="kb-chip bg-white/10 text-white border border-white/15">Data history</span>
            <h1 className="font-sora text-2xl md:text-3xl text-white">Data purchases</h1>
            <p className="text-sm text-white/70">Track your data bundles and delivery status – updated automatically.</p>
          </div>
          <Link href="/data" className="store-btn-primary px-4 py-2 text-sm w-fit">
            Buy more data
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Total purchases</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{orders.length}</div>
          <div className="text-xs text-slate-500">Data orders recorded</div>
        </div>
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Delivered</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">{deliveredCount}</div>
          <div className="text-xs text-slate-500">Successfully delivered</div>
        </div>
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">In progress</div>
          <div className="mt-1 text-2xl font-semibold text-amber-700">{pendingCount}</div>
          <div className="text-xs text-slate-500">Pending / processing</div>
        </div>
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Total spent</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(totalSpent)}</div>
          <div className="text-xs text-slate-500">Across all data purchases</div>
        </div>
      </section>

      {ordersQuery.isLoading && <div className="store-card p-4 text-sm text-slate-500">Loading your data purchases...</div>}

      {errorMessage && !ordersQuery.isLoading && (
        <div className="store-card p-4 text-sm text-rose-600 border border-rose-200 bg-rose-50">
          {isUnauthorized ? (
            <div className="space-y-2">
              <p>Sign in to view your data purchase history.</p>
              <Link href="/login" className="store-outline px-3 py-1 text-sm inline-flex">
                Sign in
              </Link>
            </div>
          ) : (
            errorMessage
          )}
        </div>
      )}

      {!ordersQuery.isLoading && !errorMessage && orders.length === 0 && (
        <div className="store-card p-4 text-sm text-slate-500">
          No data purchases yet.{" "}
          <Link href="/data" className="text-[var(--store-accent)] font-medium">
            Buy your first bundle
          </Link>
        </div>
      )}

      {!ordersQuery.isLoading && !errorMessage && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="store-card p-4 space-y-3 store-tile-lift">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500">Order ID</div>
                  <div className="text-sm font-semibold text-slate-900">{order.id}</div>
                </div>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full ${
                    order.dataStatus
                      ? dataStatusTone[order.dataStatus]
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {order.dataStatus || "PENDING"}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs text-slate-600">
                <div>
                  <span className="text-slate-500">Network: </span>
                  <span className="font-medium text-slate-900">{humanize(order.deliveryInfo.network)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Phone: </span>
                  <span className="font-medium text-slate-900">{order.deliveryInfo.phone || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Amount: </span>
                  <span className="font-medium text-slate-900">{formatCurrency(order.total)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Date: </span>
                  <span className="font-medium text-slate-900">{formatDate(order.createdAt)}</span>
                </div>
              </div>

              {order.payment && (
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                  <span>Ref: {order.payment.reference}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      order.payment.status === "SUCCESS"
                        ? "bg-emerald-100 text-emerald-700"
                        : order.payment.status === "FAILED"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.payment.status}
                  </span>
                </div>
              )}

              {order.deliveryInfo.agentSlug && (
                <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                  Purchased via agent storefront:{" "}
                  <Link href={`/agents/storefront/${order.deliveryInfo.agentSlug}`} className="text-[var(--store-accent)] font-medium">
                    {order.deliveryInfo.agentSlug}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
