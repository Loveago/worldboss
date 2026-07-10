"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import TableLayout from "../../(templates)/TableLayout";
import TableCard from "../../(shell)/components/TableCard";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type AdminPayment = {
  id: string;
  reference: string;
  amount: number | string;
  status: "INITIATED" | "SUCCESS" | "FAILED";
  createdAt: string;
  order?: { id: string; user?: { name?: string | null; email: string } | null } | null;
};

const toNumber = (value?: number | string | null) => {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number(value) : value;
};

const statusBadge = (status: AdminPayment["status"]) => {
  const tones: Record<AdminPayment["status"], string> = {
    INITIATED: "bg-amber-100 text-amber-700",
    SUCCESS: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-rose-100 text-rose-700",
  };
  return <span className={`px-2 py-1 text-xs rounded-full ${tones[status]}`}>{status}</span>;
};

export default function AdminPaymentsPage() {
  const paymentsQuery = useQuery<AdminPayment[]>({
    queryKey: ["admin-payments"],
    queryFn: () => apiFetch<AdminPayment[]>("/api/payments"),
  });

  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const errorMessage = paymentsQuery.isError
    ? paymentsQuery.error instanceof Error
      ? paymentsQuery.error.message
      : "Unable to load payments."
    : null;

  const rows = useMemo(
    () =>
      payments.map((payment) => ({
        Reference: (
          <div>
            <div className="font-semibold text-slate-900">{payment.reference}</div>
            <div className="text-xs text-slate-500">{new Date(payment.createdAt).toLocaleDateString()}</div>
          </div>
        ),
        Customer: payment.order?.user?.name || payment.order?.user?.email || "Customer",
        Amount: formatCurrency(toNumber(payment.amount)),
        Status: statusBadge(payment.status),
      })),
    [payments]
  );

  return (
    <TableLayout
      title="Payments & Paystack logs"
      toolbar={<button className="rounded-xl border border-slate-200 px-3 py-2 text-sm">Export</button>}
      table={
        paymentsQuery.isLoading ? (
          <div className="p-4 text-sm text-slate-500">Loading payments...</div>
        ) : errorMessage ? (
          <div className="p-4 text-sm text-rose-600">{errorMessage}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No payments yet.</div>
        ) : (
          <TableCard headers={["Reference", "Customer", "Amount", "Status"]} rows={rows} />
        )
      }
      mobile={
        paymentsQuery.isLoading ? (
          <div className="text-sm text-slate-500">Loading payments...</div>
        ) : errorMessage ? (
          <div className="text-sm text-rose-600">{errorMessage}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-slate-500">No payments yet.</div>
        ) : (
          <TableCard headers={["Reference", "Customer", "Amount", "Status"]} rows={rows} />
        )
      }
    />
  );
}
