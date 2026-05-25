"use client";

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

type ReceiptViewProps = {
  heading: string;
  description?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

const humanize = (value?: string | null) => {
  if (!value) return "-";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function ReceiptView({
  heading,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: ReceiptViewProps) {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const status = (params.get("status") || "success").toLowerCase();
  const payment = params.get("payment") || "paystack";
  const reference = params.get("reference") || "";
  const amountParam = params.get("amount");
  const paidAt = params.get("paidAt") || "";
  const email = params.get("email") || "";

  const fallbackAmount = amountParam ? Number(amountParam) : undefined;

  const orderQuery = useQuery<Order>({
    queryKey: ["receipt-order", orderId],
    queryFn: () => apiFetch<Order>(`/api/orders/${orderId}`),
    enabled: Boolean(orderId),
    retry: false,
  });

  const order = orderQuery.data;
  const amount =
    typeof order?.payment?.amount === "number"
      ? Number(order.payment.amount)
      : typeof order?.total === "number"
        ? Number(order.total)
        : fallbackAmount;

  const displayReference = order?.payment?.reference || reference || "Not available";
  const displayStatus = order?.payment?.status || (status === "success" ? "SUCCESS" : "FAILED");
  const orderStatus = order?.status || (status === "success" ? "PAID" : "PENDING");
  const purchasedAt = order?.createdAt || paidAt;
  const isSuccess = displayStatus === "SUCCESS" || status === "success";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-100/90 bg-gradient-to-b from-white via-emerald-50/35 to-white p-6 sm:p-8 shadow-[0_30px_70px_rgba(5,150,105,0.14)]">
        <div className="absolute -top-14 -left-10 h-36 w-36 rounded-full bg-emerald-200/45 blur-3xl" />
        <div className="absolute -bottom-16 right-0 h-44 w-44 rounded-full bg-lime-200/40 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-3xl shadow-[0_14px_28px_rgba(16,185,129,0.28)]">
              {isSuccess ? "✅" : "⚠️"}
            </div>
            <div className="space-y-1">
              <h1 className="font-sora text-2xl sm:text-3xl text-slate-900">{heading}</h1>
              <p className="text-sm text-slate-600">
                {description ||
                  (isSuccess
                    ? "Your payment went through and your receipt is ready."
                    : "We could not confirm your payment yet. You can retry or contact support with your reference.")}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5 sm:p-6 space-y-3 text-sm">
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
              <span className={`font-medium ${isSuccess ? "text-emerald-700" : "text-rose-700"}`}>{humanize(displayStatus)}</span>
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
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Signed-in order details are unavailable right now. This receipt still shows verified transaction details.
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {secondaryHref && secondaryLabel && (
              <Link href={secondaryHref} className="store-outline px-4 py-2 text-sm">
                {secondaryLabel}
              </Link>
            )}
            <Link
              href={primaryHref}
              className="rounded-full bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium shadow-[0_14px_28px_rgba(5,150,105,0.3)] hover:bg-emerald-700 transition"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
