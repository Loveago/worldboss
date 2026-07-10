"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

type VerifyResponse = {
  status: "SUCCESS" | "FAILED";
  storefrontSlug?: string;
  verification?: {
    data?: {
      reference?: string;
      amount?: number;
      currency?: string;
      paid_at?: string;
      metadata?: {
        orderId?: string;
        agentSlug?: string;
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
      <div className="kb-cosmos-panel p-6 md:p-8 space-y-4 text-center">
        <div className="relative z-10 space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-xl">
            {error ? "⚠️" : "⏳"}
          </div>
          <h1 className="font-sora text-xl md:text-2xl text-white">
            {error ? "Payment verification issue" : "Confirming your payment"}
          </h1>
          <p className="text-sm text-white/70">
            {error
              ? "We hit a snag verifying this transaction. You can retry from checkout or contact support with your reference."
              : "Please wait while we verify your transaction and prepare your receipt."}
          </p>
          {error && <p className="text-sm text-rose-200">{error}</p>}
        </div>
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
        const storefrontSlug = result.verification?.data?.metadata?.agentSlug || result.storefrontSlug;
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

        if (storefrontSlug) {
          router.replace(`/agents/storefront/${storefrontSlug}/receipt?${params.toString()}`);
          return;
        }

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
