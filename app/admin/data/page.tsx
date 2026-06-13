"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GridLayout from "../../(templates)/GridLayout";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type DataBundle = {
  id: string;
  network: "mtn" | "telecel" | "airteltigo";
  name: string;
  price: number | string;
  volume: string;
  validity: string;
  segment?: string | null;
  tag?: string | null;
  badge?: string | null;
  logoUrl?: string | null;
};

const EMPTY_BUNDLES: DataBundle[] = [];

type DataOrderStatus = "PLACED" | "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

type DataOrder = {
  id: string;
  total: number | string;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";
  dataStatus?: DataOrderStatus | null;
  createdAt: string;
  deliveryInfo?: {
    type?: string;
    network?: string;
    bundleId?: string;
    phone?: string;
  } | null;
  user?: { name?: string | null; email: string } | null;
};

const EMPTY_ORDERS: DataOrder[] = [];

type DataBundleFormState = {
  network: DataBundle["network"];
  name: string;
  price: string;
  volume: string;
  validity: string;
  segment: string;
  tag: string;
  badge: string;
  logoUrl: string;
};

const emptyBundleForm = (): DataBundleFormState => ({
  network: "mtn",
  name: "",
  price: "",
  volume: "",
  validity: "",
  segment: "",
  tag: "",
  badge: "",
  logoUrl: "",
});

const toNumber = (value?: number | string | null) => {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number(value) : value;
};

const dataStatusBadge = (status: DataOrderStatus) => {
  const tones: Record<DataOrderStatus, string> = {
    PLACED: "bg-blue-100 text-blue-700",
    PENDING: "bg-amber-100 text-amber-700",
    PROCESSING: "bg-indigo-100 text-indigo-700",
    DELIVERED: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-rose-100 text-rose-700",
  };
  return <span className={`px-2 py-1 text-xs rounded-full ${tones[status]}`}>{status}</span>;
};

export default function AdminDataOrdersPage() {
  const queryClient = useQueryClient();
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [bundleForm, setBundleForm] = useState<DataBundleFormState>(emptyBundleForm());
  const [bundleSearch, setBundleSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState<"all" | DataBundle["network"]>("all");

  const ordersQuery = useQuery<DataOrder[]>({
    queryKey: ["admin-data-orders"],
    queryFn: () => apiFetch<DataOrder[]>("/api/data/orders"),
    refetchInterval: (data) => {
      const orders = data ?? [];
      const hasActiveOrder = orders.some(
        (order: DataOrder) => (order.dataStatus ?? "PENDING") !== "DELIVERED" && (order.dataStatus ?? "PENDING") !== "FAILED"
      );
      return hasActiveOrder ? 5000 : 15000;
    },
    refetchIntervalInBackground: true,
  });

  const bundlesQuery = useQuery<DataBundle[]>({
    queryKey: ["admin-data-bundles"],
    queryFn: () => apiFetch<DataBundle[]>("/api/data/bundles"),
  });

  const saveBundleMutation = useMutation({
    mutationFn: (payload: Partial<DataBundle>) =>
      apiFetch<DataBundle>(editingBundleId ? `/api/data/bundles/${editingBundleId}` : "/api/data/bundles", {
        method: editingBundleId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data-bundles"] });
      setEditingBundleId(null);
      setBundleForm(emptyBundleForm());
    },
  });

  const deleteBundleMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/data/bundles/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-data-bundles"] }),
  });

  const [statusDrafts, setStatusDrafts] = useState<Record<string, DataOrderStatus>>({});
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const updateDataStatusMutation = useMutation({
    mutationFn: async ({ id, dataStatus }: { id: string; dataStatus: DataOrderStatus }) =>
      apiFetch<{ id: string; dataStatus: string }>(`/api/admin/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data-orders"] });
    },
  });

  const bulkDeliverMutation = useMutation({
    mutationFn: async () =>
      apiFetch<{ updated: number; total: number; dataStatus: string }>("/api/admin/orders/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataStatus: "DELIVERED" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data-orders"] });
    },
  });

  const orders = ordersQuery.data ?? EMPTY_ORDERS;
  const bundles = bundlesQuery.data ?? EMPTY_BUNDLES;
  const errorMessage = ordersQuery.isError
    ? ordersQuery.error instanceof Error
      ? ordersQuery.error.message
      : "Unable to load data orders."
    : null;

  const bundlesError = bundlesQuery.isError
    ? bundlesQuery.error instanceof Error
      ? bundlesQuery.error.message
      : "Unable to load data offers."
    : null;

  const filteredBundles = useMemo(() => {
    const normalizedSearch = bundleSearch.trim().toLowerCase();

    return bundles.filter((bundle) => {
      const matchesNetwork = networkFilter === "all" || bundle.network === networkFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        bundle.name.toLowerCase().includes(normalizedSearch) ||
        bundle.volume.toLowerCase().includes(normalizedSearch) ||
        bundle.validity.toLowerCase().includes(normalizedSearch);

      return matchesNetwork && matchesSearch;
    });
  }, [bundles, bundleSearch, networkFilter]);

  const dataStatusOptions: DataOrderStatus[] = ["PENDING", "PLACED", "PROCESSING", "DELIVERED", "FAILED"];

  const rows = useMemo(
    () =>
      orders.map((order) => {
        const bundle = order.deliveryInfo?.bundleId
          ? bundles.find((item) => item.id === order.deliveryInfo?.bundleId)
          : null;
        const currentStatus = order.dataStatus ?? "PENDING";
        const draft = statusDrafts[order.id] ?? currentStatus;
        const isUpdating = updatingStatusId === order.id;

        return {
          key: order.id,
          Order: (
            <div>
              <div className="font-semibold text-slate-900">#{order.id.slice(0, 6)}</div>
              <div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</div>
            </div>
          ),
          Customer: order.user?.name || order.user?.email || "Customer",
          Network: order.deliveryInfo?.network ?? "-",
          Bundle: bundle ? `${bundle.name} (${bundle.volume})` : order.deliveryInfo?.bundleId ?? "-",
          Phone: order.deliveryInfo?.phone ?? "-",
          Total: formatCurrency(toNumber(order.total)),
          Status: (
            <div className="flex flex-wrap items-center gap-2">
              {dataStatusBadge(currentStatus)}
              <select
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                value={draft}
                disabled={isUpdating}
                onChange={(event) =>
                  setStatusDrafts((prev) => ({ ...prev, [order.id]: event.target.value as DataOrderStatus }))
                }
              >
                {dataStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                className="text-xs px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-50"
                disabled={isUpdating || draft === currentStatus}
                onClick={() => {
                  setUpdatingStatusId(order.id);
                  updateDataStatusMutation.mutate(
                    { id: order.id, dataStatus: draft },
                    { onSettled: () => setUpdatingStatusId(null) }
                  );
                }}
              >
                {isUpdating ? "Updating..." : "Update"}
              </button>
            </div>
          ),
        };
      }),
    [orders, bundles, statusDrafts, updatingStatusId, updateDataStatusMutation]
  );

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => (o.dataStatus ?? "PENDING") === "PENDING").length;
    const active = orders.filter((o) => ["PLACED", "PROCESSING"].includes(o.dataStatus ?? "")).length;
    const done = orders.filter((o) => ["DELIVERED", "FAILED"].includes(o.dataStatus ?? "")).length;
    return { total, pending, active, done };
  }, [orders]);

  const bundleFormDisabled = saveBundleMutation.isLoading;

  const onSubmitBundleForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      network: bundleForm.network,
      name: bundleForm.name.trim(),
      price: Number(bundleForm.price),
      volume: bundleForm.volume.trim(),
      validity: bundleForm.validity.trim(),
      segment: bundleForm.segment.trim() || undefined,
      tag: bundleForm.tag.trim() || undefined,
      badge: bundleForm.badge.trim() || undefined,
      logoUrl: bundleForm.logoUrl.trim() || undefined,
    };

    saveBundleMutation.mutate(payload);
  };

  return (
    <GridLayout
      title="Data"
      actions={
        <>
          <div className="text-xs text-slate-500">
            <span>{filteredBundles.length}</span> <span>offers</span>
          </div>
          <Link href="/admin/agents" className="text-xs border border-slate-200 rounded-full px-3 py-1 bg-white hover:bg-slate-50">
            Agent pricing & withdrawals
          </Link>
        </>
      }
    >
      {/* Stats strip */}
      <section className="lg:col-span-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total orders", value: stats.total, tone: "bg-slate-900 text-white" },
            { label: "Pending", value: stats.pending, tone: "bg-amber-500 text-white" },
            { label: "Active", value: stats.active, tone: "bg-indigo-500 text-white" },
            { label: "Delivered / Failed", value: stats.done, tone: "bg-emerald-500 text-white" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.tone} flex flex-col justify-between`}>
              <span className="text-[11px] opacity-80 uppercase tracking-wide">{s.label}</span>
              <span className="text-2xl font-semibold mt-1">{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 bg-white lg:col-span-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Data orders</div>
            <div className="text-xs text-slate-500">Recent purchases and delivery details.</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs font-medium disabled:opacity-50" onClick={() => { if (!confirm("Mark ALL data orders as DELIVERED?")) return; bulkDeliverMutation.mutate(); }} disabled={bulkDeliverMutation.isLoading}>
              {bulkDeliverMutation.isLoading ? "Updating..." : "Mark all as Delivered"}
            </button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs">Export</button>
          </div>
        </div>

        {bulkDeliverMutation.isSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
            Updated {bulkDeliverMutation.data?.updated ?? 0} of {bulkDeliverMutation.data?.total ?? 0} data orders to DELIVERED.
          </div>
        )}
        {bulkDeliverMutation.isError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">
            Bulk update failed: {bulkDeliverMutation.error instanceof Error ? bulkDeliverMutation.error.message : "Unknown error"}
          </div>
        )}

        {ordersQuery.isLoading ? (
          <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-500">Loading data orders...</div>
        ) : errorMessage ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">{errorMessage}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-500">No data orders yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-medium px-2 py-1.5">Order</th>
                  <th className="text-left font-medium px-2 py-1.5">Customer</th>
                  <th className="text-left font-medium px-2 py-1.5">Network</th>
                  <th className="text-left font-medium px-2 py-1.5">Bundle</th>
                  <th className="text-left font-medium px-2 py-1.5">Phone</th>
                  <th className="text-left font-medium px-2 py-1.5">Total</th>
                  <th className="text-left font-medium px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.key} className="text-slate-700">
                    <td className="px-2 py-1.5">{row.Order}</td>
                    <td className="px-2 py-1.5">{row.Customer}</td>
                    <td className="px-2 py-1.5">{row.Network}</td>
                    <td className="px-2 py-1.5">{row.Bundle}</td>
                    <td className="px-2 py-1.5">{row.Phone}</td>
                    <td className="px-2 py-1.5">{row.Total}</td>
                    <td className="px-2 py-1.5">{row.Status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5 bg-white space-y-2 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{editingBundleId ? "Edit offer" : "New offer"}</div>
          {editingBundleId && (
            <button
              type="button"
              onClick={() => { setEditingBundleId(null); setBundleForm(emptyBundleForm()); }}
              className="text-[11px] border border-slate-200 rounded-full px-2 py-0.5 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>

        <form className="space-y-2" onSubmit={onSubmitBundleForm}>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-[11px] text-slate-500 space-y-0.5">
              <span>Network</span>
              <select
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={bundleForm.network}
                onChange={(e) => setBundleForm((prev) => ({ ...prev, network: e.target.value as DataBundle["network"] }))}
              >
                <option value="mtn">MTN</option>
                <option value="telecel">Telecel</option>
                <option value="airteltigo">AirtelTigo</option>
              </select>
            </label>
            <label className="text-[11px] text-slate-500 space-y-0.5">
              <span>Price (GHS)</span>
              <input type="number" step="0.01" min="0"
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={bundleForm.price}
                onChange={(e) => setBundleForm((prev) => ({ ...prev, price: e.target.value }))}
                required
              />
            </label>
            <label className="text-[11px] text-slate-500 space-y-0.5">
              <span>Name</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={bundleForm.name}
                onChange={(e) => setBundleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Weekend Surf"
                required
              />
            </label>
            <label className="text-[11px] text-slate-500 space-y-0.5">
              <span>Volume</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={bundleForm.volume}
                onChange={(e) => setBundleForm((prev) => ({ ...prev, volume: e.target.value }))}
                placeholder="2GB"
                required
              />
            </label>
            <label className="text-[11px] text-slate-500 space-y-0.5">
              <span>Validity</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={bundleForm.validity}
                onChange={(e) => setBundleForm((prev) => ({ ...prev, validity: e.target.value }))}
                placeholder="30 days"
                required
              />
            </label>
            <label className="text-[11px] text-slate-500 space-y-0.5">
              <span>Segment</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={bundleForm.segment}
                onChange={(e) => setBundleForm((prev) => ({ ...prev, segment: e.target.value }))}
                placeholder="daily"
              />
            </label>
            <label className="text-[11px] text-slate-500 space-y-0.5">
              <span>Tag</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={bundleForm.tag}
                onChange={(e) => setBundleForm((prev) => ({ ...prev, tag: e.target.value }))}
                placeholder="best-value"
              />
            </label>
            <label className="text-[11px] text-slate-500 space-y-0.5">
              <span>Badge</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={bundleForm.badge}
                onChange={(e) => setBundleForm((prev) => ({ ...prev, badge: e.target.value }))}
                placeholder="Hot"
              />
            </label>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Preview: <strong className="text-slate-900">{bundleForm.price ? formatCurrency(Number(bundleForm.price)) : "--"}</strong>
            </span>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 text-white px-3 py-1 text-xs disabled:opacity-50"
              disabled={bundleFormDisabled}
            >
              {saveBundleMutation.isLoading ? "Saving..." : editingBundleId ? "Update" : "Create"}
            </button>
          </div>
        </form>

        {saveBundleMutation.isError && (
          <div className="text-[11px] text-rose-600">Unable to save data offer. Please check the form fields.</div>
        )}
      </section>

      <section className="card p-5 bg-white space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Data offers</div>
          <div className="flex items-center gap-2">
            <input
              className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs"
              placeholder="Search"
              value={bundleSearch}
              onChange={(event) => setBundleSearch(event.target.value)}
            />
            <select
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
              value={networkFilter}
              onChange={(event) => setNetworkFilter(event.target.value as "all" | DataBundle["network"])}
            >
              <option value="all">All</option>
              <option value="mtn">MTN</option>
              <option value="telecel">Telecel</option>
              <option value="airteltigo">AT</option>
            </select>
          </div>
        </div>

        {bundlesQuery.isLoading && <div className="text-xs text-slate-500">Loading...</div>}
        {bundlesError && <div className="text-xs text-rose-600">{bundlesError}</div>}
        {!bundlesQuery.isLoading && !bundlesError && filteredBundles.length === 0 && (
          <div className="text-xs text-slate-500">No matching offers.</div>
        )}

        {!bundlesQuery.isLoading && !bundlesError && filteredBundles.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-medium px-2 py-1">Offer</th>
                  <th className="text-left font-medium px-2 py-1">Network</th>
                  <th className="text-right font-medium px-2 py-1">Price</th>
                  <th className="text-right font-medium px-2 py-1"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBundles.map((bundle) => (
                  <tr key={bundle.id} className={`text-slate-700 ${editingBundleId === bundle.id ? "bg-indigo-50/40" : ""}`}>
                    <td className="px-2 py-1">
                      <div className="font-medium">{bundle.name}</div>
                      <div className="text-slate-400">{bundle.volume} &middot; {bundle.validity}</div>
                    </td>
                    <td className="px-2 py-1 uppercase">{bundle.network}</td>
                    <td className="px-2 py-1 text-right font-medium">{formatCurrency(toNumber(bundle.price))}</td>
                    <td className="px-2 py-1 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-50"
                          onClick={() => {
                            setEditingBundleId(bundle.id);
                            setBundleForm({
                              network: bundle.network,
                              name: bundle.name,
                              price: String(toNumber(bundle.price)),
                              volume: bundle.volume,
                              validity: bundle.validity,
                              segment: bundle.segment ?? "",
                              tag: bundle.tag ?? "",
                              badge: bundle.badge ?? "",
                              logoUrl: bundle.logoUrl ?? "",
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="px-1.5 py-0.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => deleteBundleMutation.mutate(bundle.id)}
                          disabled={deleteBundleMutation.isLoading}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </GridLayout>
  );
}
