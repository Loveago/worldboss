"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/format";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const setQty = useCartStore((state) => state.setQty);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-sora text-2xl text-slate-900">Your cart</h1>
          <p className="text-sm text-slate-600">Review items and proceed to checkout.</p>
        </div>
        <Link href="/shop" className="store-outline px-4 py-2 text-sm w-fit">
          Continue shopping
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
            {items.map((item) => (
              <div key={`${item.productId}-${item.variant ?? "base"}`} className="store-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                    {item.variant && <div className="text-xs text-slate-500">{item.variant}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.productId, item.variant)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">{formatCurrency(item.price)}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(item.productId, item.qty - 1, item.variant)}
                      className="store-outline px-3 py-1 text-sm"
                    >
                      -
                    </button>
                    <span className="min-w-[32px] text-center text-sm font-semibold text-slate-900">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(item.productId, item.qty + 1, item.variant)}
                      className="store-outline px-3 py-1 text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatCurrency(item.price * item.qty)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="store-card p-5 space-y-4 h-fit">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-xs text-slate-500">Shipping and taxes are calculated at checkout.</p>
            <Link href="/checkout" className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm text-center">
              Proceed to checkout
            </Link>
            <button
              type="button"
              onClick={clear}
              className="store-outline px-4 py-2 text-sm"
            >
              Clear cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
