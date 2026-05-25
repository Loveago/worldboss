import { Suspense } from "react";
import ReceiptView from "./ReceiptView";

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-10" />}>
      <ReceiptView
        heading="Payment successful"
        description="Your order is confirmed and your receipt is ready."
        primaryHref="/shop"
        primaryLabel="Continue shopping"
        secondaryHref="/orders"
        secondaryLabel="View orders"
      />
    </Suspense>
  );
}
