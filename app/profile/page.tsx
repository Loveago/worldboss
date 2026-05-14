"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type ProfilePayload = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  name: string;
  phone?: string | null;
  createdAt: string;
};

type WalletTransaction = {
  id: string;
  amount: number;
  status: "INITIATED" | "SUCCESS" | "FAILED";
  reference: string | null;
  createdAt: string;
};

type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";

type ProfileOverview = {
  profile: ProfilePayload;
  wallet: {
    balance: number;
    totalDeposited: number;
    pendingDeposits: number;
    depositsCount: number;
    transactions: WalletTransaction[];
  };
  orders: {
    totalSpent: number;
    summary: {
      total: number;
      pending: number;
      inTransit: number;
      completed: number;
      canceled: number;
    };
    recent: Array<{
      id: string;
      total: number;
      status: OrderStatus;
      paymentStatus: "INITIATED" | "SUCCESS" | "FAILED";
      createdAt: string;
      itemCount: number;
    }>;
  };
};

const statusTone: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-sky-100 text-sky-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-rose-100 text-rose-700",
};

const orderProgress: Record<OrderStatus, number> = {
  PENDING: 20,
  PAID: 45,
  SHIPPED: 75,
  DELIVERED: 100,
  CANCELED: 100,
};

const orderProgressTone: Record<OrderStatus, string> = {
  PENDING: "from-amber-400 to-amber-500",
  PAID: "from-indigo-500 to-indigo-600",
  SHIPPED: "from-sky-500 to-cyan-500",
  DELIVERED: "from-emerald-500 to-emerald-600",
  CANCELED: "from-rose-500 to-rose-600",
};

const walletPresets = [20, 50, 100, 200, 500];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  const profileQuery = useQuery<ProfileOverview>({
    queryKey: ["profile-overview"],
    queryFn: () => apiFetch<ProfileOverview>("/api/profile/overview"),
  });

  const profile = profileQuery.data?.profile;
  const wallet = profileQuery.data?.wallet;
  const orderData = profileQuery.data?.orders;

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setPhone(profile.phone || "");
  }, [profile]);

  const saveProfileMutation = useMutation({
    mutationFn: (payload: { name: string; phone?: string }) =>
      apiFetch<ProfilePayload>("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-overview"] });
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
    },
  });

  const walletDepositMutation = useMutation({
    mutationFn: (payload: { amount: number; email?: string }) =>
      apiFetch<{ authorization_url: string }>("/api/profile/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
  });

  const errorMessage = profileQuery.isError
    ? profileQuery.error instanceof Error
      ? profileQuery.error.message
      : "Unable to load profile right now."
    : null;
  const isUnauthorized = errorMessage?.toLowerCase().includes("unauthorized");

  const orderCards = useMemo(
    () => [
      { label: "Total orders", value: orderData?.summary.total ?? 0 },
      { label: "Pending", value: orderData?.summary.pending ?? 0 },
      { label: "In transit", value: orderData?.summary.inTransit ?? 0 },
      { label: "Delivered", value: orderData?.summary.completed ?? 0 },
    ],
    [orderData]
  );

  const submitProfile = (event: React.FormEvent) => {
    event.preventDefault();
    saveProfileMutation.mutate({ name: name.trim(), phone: phone.trim() || undefined });
  };

  const startDeposit = (amount: number) => {
    if (!profile?.email) return;
    walletDepositMutation.mutate({ amount, email: profile.email });
  };

  const parsedDepositAmount = Number(depositAmount);

  return (
    <div className="space-y-6">
      <section className="store-glass p-5 md:p-6 lg:p-7 relative overflow-hidden">
        <div className="absolute -top-20 right-0 h-40 w-40 rounded-full bg-fuchsia-100 blur-3xl opacity-70" />
        <div className="absolute -bottom-24 left-8 h-40 w-40 rounded-full bg-sky-100 blur-3xl opacity-70" />
        <div className="relative z-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-sora text-2xl md:text-3xl text-slate-900">My Profile</h1>
            <p className="text-sm text-slate-600">Wallet, profile settings, and order tracking in one place.</p>
          </div>
          <div className="text-xs text-slate-500">Member since {profile ? formatDate(profile.createdAt) : "-"}</div>
        </div>
      </section>

      {profileQuery.isLoading && <div className="store-card p-4 text-sm text-slate-500">Loading your profile...</div>}

      {errorMessage && !profileQuery.isLoading && (
        <div className="store-card p-4 text-sm text-rose-600">
          {isUnauthorized ? (
            <div className="space-y-2">
              <p>Sign in to view your profile dashboard.</p>
              <Link href="/login" className="store-outline px-3 py-1.5 text-sm inline-flex">
                Sign in
              </Link>
            </div>
          ) : (
            errorMessage
          )}
        </div>
      )}

      {!profileQuery.isLoading && !errorMessage && profile && wallet && orderData && (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
          <div className="space-y-6">
            <section className="store-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-sora text-lg text-slate-900">Profile details</h2>
                <span className="store-pill px-2.5 py-1 text-[10px]">{profile.role}</span>
              </div>
              <form className="space-y-3" onSubmit={submitProfile}>
                <label className="space-y-1.5 block">
                  <span className="text-xs text-slate-500">Full name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full store-outline px-3 py-2 text-sm"
                    placeholder="Your name"
                  />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-xs text-slate-500">Email</span>
                  <input value={profile.email} readOnly className="w-full store-outline px-3 py-2 text-sm bg-slate-50 text-slate-500" />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-xs text-slate-500">Phone</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full store-outline px-3 py-2 text-sm"
                    placeholder="024 000 0000"
                  />
                </label>
                {saveProfileMutation.isError && (
                  <div className="text-xs text-rose-600">{saveProfileMutation.error instanceof Error ? saveProfileMutation.error.message : "Unable to save profile."}</div>
                )}
                <button
                  type="submit"
                  disabled={saveProfileMutation.isLoading || name.trim().length < 2}
                  className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm disabled:opacity-60"
                >
                  {saveProfileMutation.isLoading ? "Saving..." : "Save profile"}
                </button>
              </form>
            </section>

            <section className="store-card p-5 space-y-4">
              <h2 className="font-sora text-lg text-slate-900">Wallet</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="store-outline rounded-2xl px-4 py-3">
                  <div className="text-xs text-slate-500">Available balance</div>
                  <div className="font-sora text-xl text-slate-900 mt-1">{formatCurrency(wallet.balance)}</div>
                </div>
                <div className="store-outline rounded-2xl px-4 py-3">
                  <div className="text-xs text-slate-500">Pending deposits</div>
                  <div className="font-sora text-xl text-slate-900 mt-1">{formatCurrency(wallet.pendingDeposits)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-slate-500">Quick deposit</div>
                <div className="flex flex-wrap gap-2">
                  {walletPresets.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => startDeposit(amount)}
                      disabled={walletDepositMutation.isLoading}
                      className="store-outline px-3 py-1.5 text-xs disabled:opacity-60"
                    >
                      + {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  className="store-outline px-3 py-2 text-sm w-[170px]"
                  placeholder="Custom amount"
                />
                <button
                  type="button"
                  onClick={() => startDeposit(parsedDepositAmount)}
                  disabled={walletDepositMutation.isLoading || !Number.isFinite(parsedDepositAmount) || parsedDepositAmount <= 0}
                  className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm disabled:opacity-60"
                >
                  {walletDepositMutation.isLoading ? "Redirecting..." : "Deposit now"}
                </button>
              </div>
              {walletDepositMutation.isError && (
                <div className="text-xs text-rose-600">
                  {walletDepositMutation.error instanceof Error ? walletDepositMutation.error.message : "Unable to start deposit."}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="store-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-sora text-lg text-slate-900">Order tracking</h2>
                <Link href="/orders" className="text-sm text-[var(--store-accent)]">
                  View all orders
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {orderCards.map((card) => (
                  <div key={card.label} className="store-outline rounded-2xl px-3 py-2.5">
                    <div className="text-[11px] text-slate-500">{card.label}</div>
                    <div className="text-lg font-semibold text-slate-900 mt-1">{card.value}</div>
                  </div>
                ))}
              </div>
              <div className="store-outline rounded-2xl px-4 py-3">
                <div className="text-xs text-slate-500">Total spend</div>
                <div className="font-sora text-xl text-slate-900 mt-1">{formatCurrency(orderData.totalSpent)}</div>
              </div>

              <div className="space-y-3">
                {orderData.recent.length === 0 ? (
                  <div className="text-sm text-slate-500">No orders yet. Start shopping to track your progress here.</div>
                ) : (
                  orderData.recent.map((order) => (
                    <div key={order.id} className="store-outline rounded-2xl px-4 py-3 space-y-2.5 bg-white/75">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] text-slate-500">Order ID</div>
                          <div className="text-sm font-semibold text-slate-900">{order.id}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full ${statusTone[order.status]}`}>{order.status}</span>
                      </div>

                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${orderProgressTone[order.status]}`}
                          style={{ width: `${orderProgress[order.status]}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <span>{order.itemCount} item(s)</span>
                        <span>{formatCurrency(order.total)}</span>
                        <span>{formatDate(order.createdAt)}</span>
                        <span>Payment: {order.paymentStatus}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="store-card p-5 space-y-3">
              <h2 className="font-sora text-lg text-slate-900">Recent wallet deposits</h2>
              {wallet.transactions.length === 0 ? (
                <div className="text-sm text-slate-500">No wallet deposits yet.</div>
              ) : (
                <div className="space-y-2">
                  {wallet.transactions.map((txn) => (
                    <div key={txn.id} className="store-outline rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 bg-white/75">
                      <div>
                        <div className="text-xs text-slate-500">{formatDate(txn.createdAt)}</div>
                        <div className="text-sm font-medium text-slate-900">{formatCurrency(txn.amount)}</div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-[10px] px-2 py-1 rounded-full inline-flex ${
                            txn.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-700"
                              : txn.status === "FAILED"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {txn.status}
                        </div>
                        {txn.reference && <div className="text-[11px] text-slate-500 mt-1">{txn.reference}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
