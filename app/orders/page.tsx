"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type DataOrderStatus = "PLACED" | "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

type StoreOrder = {
  id: string;
  total: number;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";
  createdAt: string;
  items: Array<{ id: string; qty: number }>;
  _orderType?: "DATA" | "PRODUCT";
  _dataStatus?: DataOrderStatus | null;
};

export default function OrdersPage() {
  const ordersQuery = useQuery<StoreOrder[]>({
    queryKey: ["store-orders"],
    queryFn: () => apiFetch<StoreOrder[]>("/api/orders"),
  });

  const orders = ordersQuery.data ?? [];
  const errorMessage = ordersQuery.isError
    ? ordersQuery.error instanceof Error
      ? ordersQuery.error.message
      : "Unable to load orders right now."
    : null;
  const isUnauthorized = errorMessage?.toLowerCase().includes("unauthorized");
  const productOrders = orders.filter((o) => o._orderType !== "DATA");
  const dataOrders = orders.filter((o) => o._orderType === "DATA");
  const paidOrders = productOrders.filter((order) => order.status === "PAID" || order.status === "SHIPPED" || order.status === "DELIVERED").length;
  const totalSpent = productOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return (
    <div className="space-y-6">
      <section className="store-glass p-5 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,165,233,0.04)_45%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-sora text-2xl text-slate-900">Your orders</h1>
            <p className="text-sm text-slate-600">Track purchases and delivery updates.</p>
          </div>
          <Link href="/shop" className="store-outline px-4 py-2 text-sm w-fit bg-white/80">
            Continue shopping
          </Link>
        </div>
      </section>

      <section className="store-card p-0 overflow-hidden">
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Total orders</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{orders.length}</div>
            <div className="text-xs text-slate-500">Orders recorded</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Completed / in progress</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{paidOrders}</div>
            <div className="text-xs text-slate-500">Paid, shipped, delivered</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Total spend</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(totalSpent)}</div>
            <div className="text-xs text-slate-500">Across all orders</div>
          </div>
        </div>
      </section>

      {ordersQuery.isLoading && <div className="store-card p-4 text-sm text-slate-500">Loading orders...</div>}

      {errorMessage && !ordersQuery.isLoading && (
        <div className="store-card p-4 text-sm text-rose-600">
          {isUnauthorized ? (
            <div className="space-y-2">
              <p>Sign in to view your order history.</p>
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
        <div className="store-card p-4 text-sm text-slate-500">No orders yet. Start shopping today.</div>
      )}

      {!ordersQuery.isLoading && !errorMessage && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="store-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">Order ID</div>
                <div className="text-sm font-semibold text-slate-900">{order.id}</div>
                <div className="text-xs text-slate-500">
                  {new Date(order.createdAt).toLocaleDateString("en-GH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {order._orderType === "DATA" ? (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    order._dataStatus === "DELIVERED" ? "bg-emerald-100 text-emerald-700" :
                    order._dataStatus === "FAILED" ? "bg-rose-100 text-rose-700" :
                    order._dataStatus === "PROCESSING" ? "bg-indigo-100 text-indigo-700" :
                    order._dataStatus === "PLACED" ? "bg-blue-100 text-blue-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {order._dataStatus || "PENDING"}
                  </span>
                ) : (
                  <span className="store-pill px-3 py-1 text-xs">{order.status}</span>
                )}
                <span className="text-slate-500">{order._orderType === "DATA" ? "Data bundle" : `${order.items.length} items`}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Number(order.total))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
