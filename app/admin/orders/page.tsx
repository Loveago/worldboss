"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TableLayout from "../../(templates)/TableLayout";
import TableCard from "../../(shell)/components/TableCard";
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

const statusOptions: AdminOrder["status"][] = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELED"];

const toNumber = (value?: number | string | null) => {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number(value) : value;
};

const statusBadge = (status: AdminOrder["status"]) => {
  const tones: Record<AdminOrder["status"], string> = {
    PENDING: "bg-amber-100 text-amber-700",
    PAID: "bg-emerald-100 text-emerald-700",
    SHIPPED: "bg-blue-100 text-blue-700",
    DELIVERED: "bg-slate-900 text-white",
    CANCELED: "bg-rose-100 text-rose-700",
  };
  return <span className={`px-2 py-1 text-xs rounded-full ${tones[status]}`}>{status}</span>;
};

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusDrafts, setStatusDrafts] = useState<Record<string, AdminOrder["status"]>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ordersQuery = useQuery<AdminOrder[]>({
    queryKey: ["admin-orders"],
    queryFn: () => apiFetch<AdminOrder[]>("/api/orders"),
    select: (data) => data.filter((o: AdminOrder) => o._orderType !== "DATA"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AdminOrder["status"] }) =>
      apiFetch<AdminOrder>(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const orders = ordersQuery.data ?? [];
  const errorMessage = ordersQuery.isError
    ? ordersQuery.error instanceof Error
      ? ordersQuery.error.message
      : "Unable to load orders."
    : null;

  const rows = useMemo(
    () =>
      orders.map((order) => {
        const draft = statusDrafts[order.id] ?? order.status;

        return {
          Order: (
            <div>
              <div className="font-semibold text-slate-900">#{order.id.slice(0, 6)}</div>
              <div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
          ),
          Customer: order.user?.name || order.user?.email || "Customer",
          Total: formatCurrency(toNumber(order.total)),
          Status: (
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(order.status)}
              <select
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                value={draft}
                onChange={(event) =>
                  setStatusDrafts((prev) => ({ ...prev, [order.id]: event.target.value as AdminOrder["status"] }))
                }
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                className="text-xs px-2 py-1 rounded-lg border border-slate-200"
                disabled={updatingId === order.id || draft === order.status}
                onClick={() => {
                  setUpdatingId(order.id);
                  updateStatusMutation.mutate(
                    { id: order.id, status: draft },
                    { onSettled: () => setUpdatingId(null) }
                  );
                }}
              >
                {updatingId === order.id ? "Updating..." : "Update"}
              </button>
            </div>
          ),
        };
      }),
    [orders, statusDrafts, updatingId, updateStatusMutation]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-sky-900">
          <span className="font-semibold">Data orders</span> are managed separately.
        </div>
        <Link
          href="/admin/data"
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 text-white px-3 py-2 text-xs font-medium hover:bg-sky-700"
        >
          Go to Data Orders
        </Link>
      </div>

      <TableLayout
        title="Orders"
        toolbar={<button className="rounded-xl border border-slate-200 px-3 py-2 text-sm">Filter</button>}
        table={
          ordersQuery.isLoading ? (
            <div className="p-4 text-sm text-slate-500">Loading orders...</div>
          ) : errorMessage ? (
            <div className="p-4 text-sm text-rose-600">{errorMessage}</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No orders yet.</div>
          ) : (
            <TableCard headers={["Order", "Customer", "Total", "Status"]} rows={rows} />
          )
        }
        mobile={
          ordersQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading orders...</div>
          ) : errorMessage ? (
            <div className="text-sm text-rose-600">{errorMessage}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-500">No orders yet.</div>
          ) : (
            <TableCard headers={["Order", "Customer", "Total", "Status"]} rows={rows} />
          )
        }
      />
    </div>
  );
}
