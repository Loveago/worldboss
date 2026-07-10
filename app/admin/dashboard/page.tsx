"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "../../(templates)/DashboardLayout";
import StatCard, { StatTone } from "../../(shell)/components/StatCard";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type AdminOrder = {
  id: string;
  total: number | string;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";
  createdAt: string;
  user?: { name?: string | null; email: string } | null;
  _orderType?: "DATA" | "PRODUCT";
  _dataStatus?: string | null;
};

type AdminPayment = {
  id: string;
  reference: string;
  amount: number | string;
  status: "INITIATED" | "SUCCESS" | "FAILED";
  createdAt: string;
  order?: { id: string; user?: { name?: string | null; email: string } | null } | null;
};

type AdminProduct = {
  id: string;
  name: string;
  active?: boolean;
};

type AdminUser = {
  id: string;
  role: "USER" | "ADMIN";
  createdAt: string;
};

const toNumber = (value?: number | string | null) => {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number(value) : value;
};

export default function AdminDashboardPage() {
  const ordersQuery = useQuery<AdminOrder[]>({
    queryKey: ["admin-orders"],
    queryFn: () => apiFetch<AdminOrder[]>("/api/orders"),
  });

  const productOrders = useMemo(() => (ordersQuery.data ?? []).filter((o) => o._orderType !== "DATA"), [ordersQuery.data]);

  const paymentsQuery = useQuery<AdminPayment[]>({
    queryKey: ["admin-payments"],
    queryFn: () => apiFetch<AdminPayment[]>("/api/payments"),
  });

  const productsQuery = useQuery<AdminProduct[]>({
    queryKey: ["admin-products"],
    queryFn: () => apiFetch<AdminProduct[]>("/api/products"),
  });

  const usersQuery = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<AdminUser[]>("/api/users"),
  });

  const orders = productOrders;
  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const totalRevenue = useMemo(
    () => payments.reduce((sum, payment) => (payment.status === "SUCCESS" ? sum + toNumber(payment.amount) : sum), 0),
    [payments]
  );

  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "PENDING").length, [orders]);
  const activeProducts = useMemo(() => products.filter((product) => product.active !== false).length, [products]);

  const stats: Array<{ label: string; value: string; trend: string; icon: string; tone: StatTone }> = [
    {
      label: "Total revenue",
      value: paymentsQuery.isLoading ? "--" : formatCurrency(totalRevenue),
      trend: "All time",
      icon: "💰",
      tone: "blue",
    },
    {
      label: "Active products",
      value: productsQuery.isLoading ? "--" : String(activeProducts),
      trend: "Live",
      icon: "📦",
      tone: "purple",
    },
    {
      label: "Pending orders",
      value: ordersQuery.isLoading ? "--" : String(pendingOrders),
      trend: "Needs action",
      icon: "⏳",
      tone: "amber",
    },
    {
      label: "Registered users",
      value: usersQuery.isLoading ? "--" : String(users.length),
      trend: "All time",
      icon: "👥",
      tone: "rose",
    },
  ];

  const recentOrders = orders.slice(0, 5);
  const recentPayments = payments.slice(0, 5);

  const ordersError = ordersQuery.isError
    ? ordersQuery.error instanceof Error
      ? ordersQuery.error.message
      : "Unable to load orders."
    : null;
  const paymentsError = paymentsQuery.isError
    ? paymentsQuery.error instanceof Error
      ? paymentsQuery.error.message
      : "Unable to load payments."
    : null;

  return (
    <DashboardLayout
      hero={
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Mission control</div>
          <h1 className="font-sora text-2xl md:text-3xl font-semibold text-white">Admin overview</h1>
          <p className="text-sm text-white/70 max-w-2xl">
            Revenue, inventory, and fulfillment signals — tuned for the Korelly cosmos command aesthetic.
          </p>
        </div>
      }
      stats={stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    >
      <div className="card p-4 md:p-5 space-y-3 border border-[var(--admin-border)]">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900 font-sora">Recent orders</div>
          <span className="admin-pill px-2.5 py-0.5 text-[10px]">{orders.length} total</span>
        </div>
        {ordersQuery.isLoading && <div className="text-sm text-slate-500">Loading orders...</div>}
        {ordersError && <div className="text-sm text-rose-600">{ordersError}</div>}
        {!ordersQuery.isLoading && !ordersError && recentOrders.length === 0 && (
          <div className="text-sm text-slate-500">No orders yet.</div>
        )}
        {!ordersQuery.isLoading && !ordersError && recentOrders.length > 0 && (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] bg-[color-mix(in_srgb,var(--admin-card)_94%,var(--admin-bg)_6%)] px-3 py-2.5 text-sm text-slate-700"
              >
                <div>
                  <div className="font-medium text-slate-900">#{order.id.slice(0, 6)}</div>
                  <div className="text-xs text-slate-500">{order.user?.name || order.user?.email || "Guest"}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{formatCurrency(toNumber(order.total))}</div>
                  <div className="text-xs text-slate-500">{order.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card p-4 md:p-5 space-y-3 border border-[var(--admin-border)]">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900 font-sora">Recent payments</div>
          <span className="admin-pill px-2.5 py-0.5 text-[10px]">{payments.length} total</span>
        </div>
        {paymentsQuery.isLoading && <div className="text-sm text-slate-500">Loading payments...</div>}
        {paymentsError && <div className="text-sm text-rose-600">{paymentsError}</div>}
        {!paymentsQuery.isLoading && !paymentsError && recentPayments.length === 0 && (
          <div className="text-sm text-slate-500">No payments yet.</div>
        )}
        {!paymentsQuery.isLoading && !paymentsError && recentPayments.length > 0 && (
          <div className="space-y-2">
            {recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] bg-[color-mix(in_srgb,var(--admin-card)_94%,var(--admin-bg)_6%)] px-3 py-2.5 text-sm text-slate-700"
              >
                <div>
                  <div className="font-medium text-slate-900">{payment.reference}</div>
                  <div className="text-xs text-slate-500">
                    {payment.order?.user?.name || payment.order?.user?.email || "Customer"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{formatCurrency(toNumber(payment.amount))}</div>
                  <div className="text-xs text-slate-500">{payment.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
