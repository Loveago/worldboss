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

type DataOrder = {
  id: string;
  total: number | string;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";
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

const statusBadge = (status: DataOrder["status"]) => {
  const tones: Record<DataOrder["status"], string> = {
    PENDING: "bg-amber-100 text-amber-700",
    PAID: "bg-emerald-100 text-emerald-700",
    SHIPPED: "bg-blue-100 text-blue-700",
    DELIVERED: "bg-slate-900 text-white",
    CANCELED: "bg-rose-100 text-rose-700",
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

  const rows = useMemo(
    () =>
      orders.map((order) => {
        const bundle = order.deliveryInfo?.bundleId
          ? bundles.find((item) => item.id === order.deliveryInfo?.bundleId)
          : null;
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
          Status: statusBadge(order.status),
        };
      }),
    [orders, bundles]
  );

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
      <section className="card p-5 bg-white space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">{editingBundleId ? "Edit data offer" : "New data offer"}</div>
            <div className="text-xs text-slate-500">Create and update mobile data bundles your team can sell.</div>
          </div>
          {editingBundleId && (
            <button
              type="button"
              onClick={() => {
                setEditingBundleId(null);
                setBundleForm(emptyBundleForm());
              }}
              className="text-xs border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-50"
            >
              Cancel edit
            </button>
          )}
        </div>

        <form className="space-y-4" onSubmit={onSubmitBundleForm}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-500 space-y-1">
              <span>Network</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bundleForm.network}
                onChange={(event) =>
                  setBundleForm((prev) => ({ ...prev, network: event.target.value as DataBundle["network"] }))
                }
              >
                <option value="mtn">MTN</option>
                <option value="telecel">Telecel</option>
                <option value="airteltigo">AirtelTigo</option>
              </select>
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Offer name</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bundleForm.name}
                onChange={(event) => setBundleForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Weekend Surf"
                required
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Volume</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bundleForm.volume}
                onChange={(event) => setBundleForm((prev) => ({ ...prev, volume: event.target.value }))}
                placeholder="2GB"
                required
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Validity</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bundleForm.validity}
                onChange={(event) => setBundleForm((prev) => ({ ...prev, validity: event.target.value }))}
                placeholder="30 days"
                required
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Price (GHS)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bundleForm.price}
                onChange={(event) => setBundleForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Segment (optional)</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bundleForm.segment}
                onChange={(event) => setBundleForm((prev) => ({ ...prev, segment: event.target.value }))}
                placeholder="daily"
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Tag (optional)</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bundleForm.tag}
                onChange={(event) => setBundleForm((prev) => ({ ...prev, tag: event.target.value }))}
                placeholder="best-value"
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Badge (optional)</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bundleForm.badge}
                onChange={(event) => setBundleForm((prev) => ({ ...prev, badge: event.target.value }))}
                placeholder="Hot"
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1 md:col-span-2">
              <span>Logo URL (optional)</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bundleForm.logoUrl}
                onChange={(event) => setBundleForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                placeholder="https://"
              />
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>
              Preview price: <strong className="text-slate-900">{bundleForm.price ? formatCurrency(Number(bundleForm.price)) : "--"}</strong>
            </span>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
              disabled={bundleFormDisabled}
            >
              {saveBundleMutation.isLoading ? "Saving..." : editingBundleId ? "Update offer" : "Create offer"}
            </button>
          </div>
        </form>

        {saveBundleMutation.isError && (
          <div className="text-xs text-rose-600">Unable to save data offer. Please check the form fields.</div>
        )}
      </section>

      <section className="card p-5 bg-white space-y-3 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Data offers</div>
            <div className="text-xs text-slate-500">Filter and edit offers quickly without leaving this page.</div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full sm:w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Search name/volume"
              value={bundleSearch}
              onChange={(event) => setBundleSearch(event.target.value)}
            />
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={networkFilter}
              onChange={(event) => setNetworkFilter(event.target.value as "all" | DataBundle["network"])}
            >
              <option value="all">All networks</option>
              <option value="mtn">MTN</option>
              <option value="telecel">Telecel</option>
              <option value="airteltigo">AirtelTigo</option>
            </select>
          </div>
        </div>

        {bundlesQuery.isLoading && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Loading data offers...</div>}
        {bundlesError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{bundlesError}</div>}
        {!bundlesQuery.isLoading && !bundlesError && filteredBundles.length === 0 && (
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">No matching data offers found.</div>
        )}

        {!bundlesQuery.isLoading &&
          !bundlesError &&
          filteredBundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`rounded-2xl border p-4 space-y-3 ${
                editingBundleId === bundle.id ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">{bundle.name}</div>
                  <div className="text-xs text-slate-500 uppercase">{bundle.network}</div>
                </div>
                {bundle.badge && <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-xs">{bundle.badge}</span>}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>
                  {bundle.volume} · {bundle.validity}
                </span>
                <span className="font-semibold text-slate-900">{formatCurrency(toNumber(bundle.price))}</span>
                {bundle.tag && <span className="text-xs text-slate-500">#{bundle.tag}</span>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="text-xs px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
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
                  className="text-xs px-3 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() => deleteBundleMutation.mutate(bundle.id)}
                  disabled={deleteBundleMutation.isLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </section>

      <section className="card p-5 bg-white space-y-3 lg:col-span-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Data orders</div>
            <div className="text-xs text-slate-500">Recent purchases and delivery details.</div>
          </div>
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm">Export</button>
        </div>

        {ordersQuery.isLoading ? (
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Loading data orders...</div>
        ) : errorMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{errorMessage}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">No data orders yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Order</th>
                  <th className="text-left font-medium px-3 py-2">Customer</th>
                  <th className="text-left font-medium px-3 py-2">Network</th>
                  <th className="text-left font-medium px-3 py-2">Bundle</th>
                  <th className="text-left font-medium px-3 py-2">Phone</th>
                  <th className="text-left font-medium px-3 py-2">Total</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.key} className="text-slate-700">
                    <td className="px-3 py-2">{row.Order}</td>
                    <td className="px-3 py-2">{row.Customer}</td>
                    <td className="px-3 py-2">{row.Network}</td>
                    <td className="px-3 py-2">{row.Bundle}</td>
                    <td className="px-3 py-2">{row.Phone}</td>
                    <td className="px-3 py-2">{row.Total}</td>
                    <td className="px-3 py-2">{row.Status}</td>
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
