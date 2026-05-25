import { Suspense } from "react";
import ReceiptView from "@/app/receipts/ReceiptView";

type StorefrontReceiptPageProps = {
  params: {
    slug: string;
  };
};

export default function StorefrontReceiptPage({ params }: StorefrontReceiptPageProps) {
  const storefrontHref = `/agents/storefront/${params.slug}`;

  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-10" />}>
      <ReceiptView
        heading="Data purchase complete"
        description="Your data order has been confirmed. You can return to this storefront and buy again anytime."
        primaryHref={storefrontHref}
        primaryLabel="Back to storefront"
        secondaryHref="/orders"
        secondaryLabel="View orders"
      />
    </Suspense>
  );
}
