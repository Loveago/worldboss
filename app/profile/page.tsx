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

type AgentDashboardOverview = {
  hasApplication: boolean;
  isApproved: boolean;
  profile: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    storefrontSlug: string;
    storefrontName: string;
  } | null;
  storefrontLink: string | null;
};

type WalletTransaction = {
  id: string;
  amount: number;
  status: "INITIATED" | "SUCCESS" | "FAILED";
  reference: string | null;
  createdAt: string;
};

type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";
type DataOrderStatus = "PLACED" | "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

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
  dataOrders?: {
    summary: {
      total: number;
      placed: number;
      processing: number;
      delivered: number;
      failed: number;
      pending: number;
    };
    recent: Array<{
      id: string;
      total: number;
      dataStatus: DataOrderStatus;
      createdAt: string;
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

const dataStatusTone: Record<DataOrderStatus, string> = {
  PLACED: "bg-blue-100 text-blue-700",
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
};

const dataStatusProgress: Record<DataOrderStatus, number> = {
  PLACED: 20,
  PENDING: 40,
  PROCESSING: 70,
  DELIVERED: 100,
  FAILED: 100,
};

const dataStatusProgressTone: Record<DataOrderStatus, string> = {
  PLACED: "from-blue-400 to-blue-500",
  PENDING: "from-amber-400 to-amber-500",
  PROCESSING: "from-indigo-500 to-indigo-600",
  DELIVERED: "from-emerald-500 to-emerald-600",
  FAILED: "from-rose-500 to-rose-600",
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
type DashboardPanel = "overview" | "profile" | "wallet" | "orders" | "agent";

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
  const [activePanel, setActivePanel] = useState<DashboardPanel>("overview");
  const [storefrontName, setStorefrontName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentWhatsapp, setAgentWhatsapp] = useState("");

  const profileQuery = useQuery<ProfileOverview>({
    queryKey: ["profile-overview"],
    queryFn: () => apiFetch<ProfileOverview>("/api/profile/overview"),
  });

  const profile = profileQuery.data?.profile;
  const wallet = profileQuery.data?.wallet;
  const orderData = profileQuery.data?.orders;
  const dataOrderData = profileQuery.data?.dataOrders;

  const agentDashboardQuery = useQuery<AgentDashboardOverview>({
    queryKey: ["agent-dashboard"],
    queryFn: () => apiFetch<AgentDashboardOverview>("/api/agent/dashboard"),
    enabled: Boolean(profile),
  });

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

  const applyAgentMutation = useMutation({
    mutationFn: (payload: { storefrontName: string; contactPhone: string; whatsappNumber: string }) =>
      apiFetch<{ storefrontSlug: string; status: string }>("/api/agents/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
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
  const agentData = agentDashboardQuery.data;
  const profileInitial = (profile?.name?.trim()?.charAt(0) || "U").toUpperCase();
  const tabs: Array<{ key: DashboardPanel; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "profile", label: "Profile" },
    { key: "wallet", label: "Wallet" },
    { key: "orders", label: "Orders" },
    { key: "agent", label: "Agent" },
  ];

  return (
    <div className="space-y-6">
      <section className="store-glass p-5 md:p-6 lg:p-7 relative overflow-hidden store-fade-up">
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
        <>
          <section className="store-glass p-5 md:p-6 relative overflow-hidden store-fade-up" style={{ animationDelay: "80ms" }}>
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,165,233,0.04)_45%,transparent_70%)]" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-semibold text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  {profileInitial}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-sora text-2xl text-slate-900">{profile.name}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold">{profile.role}</span>
                  </div>
                  <p className="text-sm text-slate-600">{profile.email}</p>
                  <p className="text-xs text-slate-500">Member since {formatDate(profile.createdAt)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivePanel("profile")}
                className="store-outline px-4 py-2 text-sm font-medium text-slate-700 bg-white/80 w-fit"
              >
                Edit profile
              </button>
            </div>
          </section>

          <section className="store-card p-0 overflow-hidden store-fade-up" style={{ animationDelay: "110ms" }}>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Wallet balance</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(wallet.balance)}</div>
                <div className="text-xs text-slate-500">Available to spend</div>
              </div>
              <div className="px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Total spent</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(orderData.totalSpent)}</div>
                <div className="text-xs text-slate-500">All-time spending</div>
              </div>
              <div className="px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Total orders</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{orderData.summary.total}</div>
                <div className="text-xs text-slate-500">Orders placed</div>
              </div>
              <div className="px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Wallet deposits</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{wallet.depositsCount}</div>
                <div className="text-xs text-slate-500">Successful top-ups</div>
              </div>
            </div>
          </section>

          <section className="store-fade-up" style={{ animationDelay: "130ms" }}>
            <div className="dashboard-menu-row border-b border-slate-200 pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActivePanel(tab.key)}
                  className={`dashboard-menu-btn px-2 py-2 text-sm font-medium border-b-2 transition ${
                    activePanel === tab.key
                      ? "border-[var(--store-accent)] text-[var(--store-accent)]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {activePanel === "overview" && (
            <section className="grid gap-4 lg:grid-cols-5 store-fade-up" style={{ animationDelay: "150ms" }}>
              <div className="store-card p-4 md:p-5 lg:col-span-3">
                <h3 className="font-sora text-lg text-slate-900">Profile details</h3>
                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white/70">
                  <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                    <span className="text-slate-500">Full name</span>
                    <span className="font-medium text-slate-900">{profile.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                    <span className="text-slate-500">Email address</span>
                    <span className="font-medium text-slate-900">{profile.email}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-medium text-slate-900">{profile.phone || "Not added"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                    <span className="text-slate-500">Role</span>
                    <span className="font-medium text-slate-900">{profile.role}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                    <span className="text-slate-500">Member since</span>
                    <span className="font-medium text-slate-900">{formatDate(profile.createdAt)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                    <span className="text-slate-500">Account status</span>
                    <span className="inline-flex items-center gap-2 font-medium text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="store-card p-4 md:p-5 lg:col-span-2">
                <h3 className="font-sora text-lg text-slate-900">Quick actions</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={() => setActivePanel("orders")}
                    className="store-outline text-left rounded-xl px-3 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="font-medium text-slate-900">View Orders</div>
                    <div className="text-xs text-slate-500 mt-0.5">Track your purchases and delivery status</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel("wallet")}
                    className="store-outline text-left rounded-xl px-3 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="font-medium text-slate-900">Wallet</div>
                    <div className="text-xs text-slate-500 mt-0.5">Manage balance and deposits</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel("profile")}
                    className="store-outline text-left rounded-xl px-3 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="font-medium text-slate-900">Edit Profile</div>
                    <div className="text-xs text-slate-500 mt-0.5">Update your personal information</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel("agent")}
                    className="store-outline text-left rounded-xl px-3 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="font-medium text-slate-900">Agent Program</div>
                    <div className="text-xs text-slate-500 mt-0.5">Apply or manage your storefront status</div>
                  </button>
                </div>
              </div>
            </section>
          )}

          {activePanel === "profile" && (
            <section className="store-card p-4 md:p-5 space-y-4 store-fade-up" style={{ animationDelay: "170ms" }}>
              <div className="flex items-center justify-between">
                <h2 className="font-sora text-lg text-slate-900">Edit profile</h2>
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
          )}

          {activePanel === "wallet" && (
            <section className="grid gap-4 lg:grid-cols-3 store-fade-up" style={{ animationDelay: "190ms" }}>
              <div className="store-card p-4 md:p-5 space-y-4 lg:col-span-2">
                <h2 className="font-sora text-lg text-slate-900">Wallet</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="store-outline store-tile-lift rounded-2xl px-4 py-3 bg-white/75">
                    <div className="text-xs text-slate-500">Available balance</div>
                    <div className="font-sora text-xl text-slate-900 mt-1">{formatCurrency(wallet.balance)}</div>
                  </div>
                  <div className="store-outline store-tile-lift rounded-2xl px-4 py-3 bg-white/75">
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
              </div>

              <div className="store-card p-4 md:p-5 space-y-3">
                <h2 className="font-sora text-lg text-slate-900">Recent deposits</h2>
                {wallet.transactions.length === 0 ? (
                  <div className="text-sm text-slate-500">No wallet deposits yet.</div>
                ) : (
                  <div className="space-y-2">
                    {wallet.transactions.map((txn) => (
                      <div key={txn.id} className="store-outline rounded-xl px-3 py-2 bg-white/75 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-slate-500">{formatDate(txn.createdAt)}</div>
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
                        </div>
                        <div className="text-sm font-medium text-slate-900">{formatCurrency(txn.amount)}</div>
                        {txn.reference && <div className="text-[11px] text-slate-500">{txn.reference}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activePanel === "orders" && (
            <section className="store-card p-4 md:p-5 space-y-4 store-fade-up" style={{ animationDelay: "210ms" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-sora text-lg text-slate-900">Order tracking</h2>
                <div className="flex flex-wrap gap-2">
                  <Link href="/orders" className="text-sm text-[var(--store-accent)]">
                    Product orders
                  </Link>
                  <Link href="/data-orders" className="text-sm text-[var(--store-accent)]">
                    Data purchases
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {orderCards.map((card) => (
                  <div key={card.label} className="store-outline store-tile-lift rounded-2xl px-3 py-2.5 bg-white/75">
                    <div className="text-[11px] text-slate-500">{card.label}</div>
                    <div className="text-lg font-semibold text-slate-900 mt-1">{card.value}</div>
                  </div>
                ))}
              </div>
              <div className="store-outline rounded-2xl px-4 py-3 bg-white/75">
                <div className="text-xs text-slate-500">Total spend</div>
                <div className="font-sora text-xl text-slate-900 mt-1">{formatCurrency(orderData.totalSpent)}</div>
              </div>

              <div className="space-y-3">
                {/* Product orders */}
                {orderData.recent.length === 0 && (
                  <div className="text-sm text-slate-500">No product orders yet. Start shopping to track your progress here.</div>
                )}
                {orderData.recent.map((order) => (
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
                ))}

                {/* Data orders */}
                {dataOrderData && dataOrderData.recent.length > 0 && (
                  <>
                    <div className="pt-2">
                      <div className="text-sm font-semibold text-slate-900">Data purchases</div>
                      <div className="text-xs text-slate-500">Status is updated automatically by the provider.</div>
                    </div>
                    {dataOrderData.recent.map((order) => (
                      <div key={order.id} className="store-outline rounded-2xl px-4 py-3 space-y-2.5 bg-white/75">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-slate-500">Data Order ID</div>
                            <div className="text-sm font-semibold text-slate-900">{order.id}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full ${dataStatusTone[order.dataStatus]}`}>{order.dataStatus}</span>
                        </div>

                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${dataStatusProgressTone[order.dataStatus]}`}
                            style={{ width: `${dataStatusProgress[order.dataStatus]}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                          <span>Data bundle</span>
                          <span>{formatCurrency(order.total)}</span>
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {orderData.recent.length === 0 && (!dataOrderData || dataOrderData.recent.length === 0) && (
                  <div className="text-sm text-slate-500">No orders yet. Start shopping to track your progress here.</div>
                )}
              </div>
            </section>
          )}

          {activePanel === "agent" && (
            <section className="store-card p-4 md:p-5 space-y-3 store-fade-up" style={{ animationDelay: "230ms" }}>
              <h2 className="font-sora text-lg text-slate-900">Agent program</h2>

              {agentDashboardQuery.isLoading && <div className="text-sm text-slate-500">Loading agent status...</div>}

              {agentDashboardQuery.isError && (
                <div className="text-xs text-rose-600">
                  {agentDashboardQuery.error instanceof Error ? agentDashboardQuery.error.message : "Unable to load agent status."}
                </div>
              )}

              {!agentDashboardQuery.isLoading && !agentDashboardQuery.isError && agentData && !agentData.hasApplication && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Apply here to become a Korrely data agent and get your storefront link.</p>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Storefront name</label>
                    <input
                      className="w-full store-outline px-3 py-2 text-sm"
                      value={storefrontName}
                      onChange={(event) => setStorefrontName(event.target.value)}
                      placeholder="Kwame Data Deals"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="w-full store-outline px-3 py-2 text-sm"
                      value={agentPhone}
                      onChange={(event) => setAgentPhone(event.target.value)}
                      placeholder="Phone number"
                    />
                    <input
                      className="w-full store-outline px-3 py-2 text-sm"
                      value={agentWhatsapp}
                      onChange={(event) => setAgentWhatsapp(event.target.value)}
                      placeholder="WhatsApp number"
                    />
                  </div>
                  {applyAgentMutation.isError && (
                    <div className="text-xs text-rose-600">
                      {applyAgentMutation.error instanceof Error ? applyAgentMutation.error.message : "Unable to submit application."}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      applyAgentMutation.mutate({
                        storefrontName: storefrontName.trim(),
                        contactPhone: agentPhone.trim(),
                        whatsappNumber: agentWhatsapp.trim(),
                      })
                    }
                    disabled={applyAgentMutation.isLoading || !storefrontName.trim() || !agentPhone.trim() || !agentWhatsapp.trim()}
                    className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {applyAgentMutation.isLoading ? "Submitting..." : "Apply to become an agent"}
                  </button>
                </div>
              )}

              {!agentDashboardQuery.isLoading && !agentDashboardQuery.isError && agentData?.hasApplication && (
                <div className="space-y-2 text-sm text-slate-600">
                  <div>
                    Status: <span className="font-semibold text-slate-900">{agentData.profile?.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/agent/dashboard" className="store-outline px-3 py-1.5 text-xs">
                      Open agent dashboard
                    </Link>
                    {agentData.storefrontLink && (
                      <Link href={agentData.storefrontLink} className="store-outline px-3 py-1.5 text-xs">
                        Open storefront
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
