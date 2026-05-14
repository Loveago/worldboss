"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";

type PaystackInit = {
  authorization_url?: string;
  data?: { authorization_url?: string } | null;
};

type CheckoutProfileOverview = {
  profile: {
    email: string;
  };
  wallet: {
    balance: number;
  };
};

type PaymentMethod = "paystack" | "wallet";

const resolveAuthUrl = (init: PaystackInit | null) =>
  init?.authorization_url || init?.data?.authorization_url || null;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paystack");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileOverviewQuery = useQuery<CheckoutProfileOverview>({
    queryKey: ["checkout-profile-overview"],
    queryFn: () => apiFetch<CheckoutProfileOverview>("/api/profile/overview"),
    retry: false,
  });

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items]
  );

  const walletBalance = profileOverviewQuery.data?.wallet.balance ?? 0;
  const savedEmail = profileOverviewQuery.data?.profile.email ?? "";

  useEffect(() => {
    if (!savedEmail) return;
    setEmail((prev) => prev || savedEmail);
  }, [savedEmail]);

  const isUnauthorized = error?.toLowerCase().includes("unauthorized");

  const handleCheckout = async () => {
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }
    if (paymentMethod === "paystack" && !email.trim() && !savedEmail) {
      setError("Enter your email to continue.");
      return;
    }

    if (paymentMethod === "wallet" && walletBalance < subtotal) {
      setError("Insufficient wallet balance. Deposit funds or use Paystack.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const order = await apiFetch<{ id: string }>("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            variant: item.variant ?? undefined,
          })),
          deliveryInfo: {
            name: name || undefined,
            phone: phone || undefined,
            address: address || undefined,
          },
        }),
      });

      if (paymentMethod === "wallet") {
        await apiFetch<{ orderId: string }>("/api/profile/wallet/charge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });
        clear();
        router.push("/orders?paid=wallet");
        return;
      }

      const init = await apiFetch<PaystackInit>("/api/payments/paystack/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, email: email.trim() || savedEmail }),
      });

      const authUrl = resolveAuthUrl(init);
      if (!authUrl) {
        throw new Error("Unable to initialize Paystack checkout.");
      }
      clear();
      router.push(authUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-sora text-2xl text-slate-900">Checkout</h1>
          <p className="text-sm text-slate-600">Confirm your details and pay securely.</p>
        </div>
        <Link href="/cart" className="store-outline px-4 py-2 text-sm w-fit">
          Back to cart
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="store-card p-6 text-sm text-slate-600 space-y-3">
          <p>Your cart is empty.</p>
          <Link href="/shop" className="store-outline px-4 py-2 text-sm inline-flex">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="store-card p-5 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Delivery details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Full name</label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full store-outline px-3 py-2 text-sm"
                    placeholder="Ama Mensah"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500">Phone number</label>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full store-outline px-3 py-2 text-sm"
                    placeholder="024 000 0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Delivery address</label>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="w-full store-outline px-3 py-2 text-sm"
                  placeholder="Street address, city"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-2">Payment method</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("paystack")}
                      className={`store-outline px-3 py-2 text-sm text-left ${
                        paymentMethod === "paystack" ? "ring-2 ring-[var(--store-accent)]" : ""
                      }`}
                    >
                      <div className="font-medium text-slate-900">Paystack</div>
                      <div className="text-xs text-slate-500 mt-0.5">Card, bank, or mobile money</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("wallet")}
                      className={`store-outline px-3 py-2 text-sm text-left ${
                        paymentMethod === "wallet" ? "ring-2 ring-[var(--store-accent)]" : ""
                      }`}
                    >
                      <div className="font-medium text-slate-900">Wallet</div>
                      <div className="text-xs text-slate-500 mt-0.5">Available: {formatCurrency(walletBalance)}</div>
                    </button>
                  </div>
                </div>

                {paymentMethod === "paystack" && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Email for Paystack</label>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full store-outline px-3 py-2 text-sm"
                      type="email"
                      placeholder="you@email.com"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="store-card p-5 space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
              <div className="space-y-3 text-sm">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.variant ?? "base"}`} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{item.name}</div>
                      {item.variant && <div className="text-xs text-slate-500">{item.variant}</div>}
                      <div className="text-xs text-slate-500">Qty {item.qty}</div>
                    </div>
                    <div className="font-semibold text-slate-900">
                      {formatCurrency(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="store-card p-5 space-y-4 h-fit">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total</span>
              <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-xs text-slate-500">
              {paymentMethod === "wallet"
                ? "Wallet payment will complete instantly if your balance is sufficient."
                : "You will be redirected to Paystack to complete payment."}
            </p>
            {paymentMethod === "wallet" && (
              <div className="store-outline px-3 py-2 text-xs text-slate-600">
                Wallet balance: <span className="font-semibold text-slate-900">{formatCurrency(walletBalance)}</span>
              </div>
            )}
            {error && (
              <div className="store-card p-3 text-xs text-rose-600">
                {isUnauthorized ? (
                  <div className="space-y-2">
                    <p>Sign in to complete checkout.</p>
                    <Link href="/login" className="store-outline px-3 py-1 text-xs inline-flex">
                      Sign in
                    </Link>
                  </div>
                ) : (
                  error
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting}
              className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm disabled:opacity-60"
            >
              {submitting ? "Processing..." : paymentMethod === "wallet" ? "Pay with Wallet" : "Pay with Paystack"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
