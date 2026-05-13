"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type StoreOrder = {
  id: string;
  total: number;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";
  createdAt: string;
  items: Array<{ id: string; qty: number }>;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-sora text-2xl text-slate-900">Your orders</h1>
          <p className="text-sm text-slate-600">Track purchases and delivery updates.</p>
        </div>
        <Link href="/shop" className="store-outline px-4 py-2 text-sm w-fit">
          Continue shopping
        </Link>
      </div>

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
                <span className="store-pill px-3 py-1 text-xs">{order.status}</span>
                <span className="text-slate-500">{order.items.length} items</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Number(order.total))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
