"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

type VerifyResponse = {
  status: "SUCCESS" | "FAILED";
  verification?: {
    data?: {
      reference?: string;
      amount?: number;
      currency?: string;
      paid_at?: string;
      metadata?: {
        orderId?: string;
      };
      customer?: {
        email?: string;
      };
      status?: string;
    };
  };
};

function PaymentCallbackCard({ error }: { error?: string | null }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <div className="store-card p-6 space-y-3 text-center">
        <h1 className="font-sora text-xl text-slate-900">Confirming your payment</h1>
        <p className="text-sm text-slate-600">Please wait while we verify your transaction and prepare your receipt.</p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const reference = useMemo(
    () => searchParams.get("reference") || searchParams.get("trxref") || "",
    [searchParams]
  );

  const orderIdFromQuery = searchParams.get("orderId") || "";

  useEffect(() => {
    let active = true;

    const runVerification = async () => {
      if (!reference) {
        setError("Missing transaction reference from payment provider.");
        return;
      }

      try {
        const result = await apiFetch<VerifyResponse>("/api/payments/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });

        if (!active) return;

        const verifiedOrderId = result.verification?.data?.metadata?.orderId || orderIdFromQuery;
        const currency = result.verification?.data?.currency || "GHS";
        const amount = typeof result.verification?.data?.amount === "number" ? result.verification.data.amount / 100 : undefined;
        const params = new URLSearchParams();
        params.set("payment", "paystack");
        params.set("reference", reference);
        params.set("status", result.status === "SUCCESS" ? "success" : "failed");
        if (verifiedOrderId) params.set("orderId", verifiedOrderId);
        if (currency) params.set("currency", currency);
        if (typeof amount === "number" && !Number.isNaN(amount)) params.set("amount", amount.toString());
        if (result.verification?.data?.paid_at) params.set("paidAt", result.verification.data.paid_at);
        if (result.verification?.data?.customer?.email) params.set("email", result.verification.data.customer.email);

        router.replace(`/receipts?${params.toString()}`);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to verify payment.");
      }
    };

    runVerification();

    return () => {
      active = false;
    };
  }, [reference, orderIdFromQuery, router]);

  return <PaymentCallbackCard error={error} />;
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<PaymentCallbackCard />}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
