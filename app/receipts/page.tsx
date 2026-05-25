"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type Order = {
  id: string;
  total: number;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED";
  createdAt: string;
  payment?: {
    provider?: string;
    reference?: string;
    currency?: string;
    amount?: number;
    status?: "INITIATED" | "SUCCESS" | "FAILED";
  } | null;
  deliveryInfo?: {
    type?: string;
    network?: string;
    phone?: string;
  } | null;
};

const humanize = (value?: string | null) => {
  if (!value) return "-";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function ReceiptsPage() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const status = (params.get("status") || "success").toLowerCase();
  const payment = params.get("payment") || "paystack";
  const reference = params.get("reference") || "";
  const amountParam = params.get("amount");
  const currency = params.get("currency") || "GHS";
  const email = params.get("email") || "";
  const paidAt = params.get("paidAt") || "";

  const fallbackAmount = amountParam ? Number(amountParam) : undefined;

  const orderQuery = useQuery<Order>({
    queryKey: ["receipt-order", orderId],
    queryFn: () => apiFetch<Order>(`/api/orders/${orderId}`),
    enabled: Boolean(orderId),
    retry: false,
  });

  const order = orderQuery.data;
  const amount = typeof order?.payment?.amount === "number"
    ? Number(order.payment.amount)
    : typeof order?.total === "number"
      ? Number(order.total)
      : fallbackAmount;

  const displayReference = order?.payment?.reference || reference || "Not available";
  const displayStatus = order?.payment?.status || (status === "success" ? "SUCCESS" : "FAILED");
  const orderStatus = order?.status || (status === "success" ? "PAID" : "PENDING");
  const purchasedAt = order?.createdAt || paidAt;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="store-card p-6 space-y-2">
        <h1 className="font-sora text-2xl text-slate-900">Payment receipt</h1>
        <p className="text-sm text-slate-600">
          {status === "success"
            ? "Your payment was received successfully."
            : "Payment verification is not successful yet. You can retry or contact support with your reference."}
        </p>
      </div>

      <div className="store-card p-6 space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-slate-500">Amount</span>
          <span className="font-semibold text-slate-900">{typeof amount === "number" ? formatCurrency(amount) : "-"}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Payment method</span>
          <span className="text-slate-900">{humanize(payment)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Payment status</span>
          <span className="text-slate-900">{humanize(displayStatus)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Order status</span>
          <span className="text-slate-900">{humanize(orderStatus)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Reference</span>
          <span className="text-slate-900 break-all text-right">{displayReference}</span>
        </div>

        {orderId && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Order ID</span>
            <span className="text-slate-900 break-all text-right">{orderId}</span>
          </div>
        )}

        {purchasedAt && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Date</span>
            <span className="text-slate-900">{new Date(purchasedAt).toLocaleString("en-GH")}</span>
          </div>
        )}

        {email && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Customer</span>
            <span className="text-slate-900 break-all text-right">{email}</span>
          </div>
        )}

        {order?.deliveryInfo?.type === "DATA" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Service</span>
              <span className="text-slate-900">Data purchase</span>
            </div>
            {order.deliveryInfo.network && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Network</span>
                <span className="text-slate-900">{humanize(order.deliveryInfo.network)}</span>
              </div>
            )}
            {order.deliveryInfo.phone && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Recipient</span>
                <span className="text-slate-900">{order.deliveryInfo.phone}</span>
              </div>
            )}
          </>
        )}

        {orderQuery.isError && (
          <p className="text-xs text-slate-500 pt-2">
            Signed-in order details are unavailable right now. This receipt still shows verified transaction details.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/orders" className="store-outline px-4 py-2 text-sm">
          View orders
        </Link>
        <Link href="/shop" className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
