"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/format";

export type StoreProduct = {
  id: string;
  categoryId?: string;
  name: string;
  price: number | string;
  salePrice?: number | string | null;
  stock: number;
  type: "PHYSICAL" | "DIGITAL";
  category?: { name: string; slug?: string | null } | null;
  media?: unknown;
};

function resolvePrice(value?: number | string | null) {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number(value) : value;
}

function resolveImage(media?: unknown) {
  if (!media) return null;
  if (typeof media === "string") return media;
  if (Array.isArray(media)) return typeof media[0] === "string" ? media[0] : null;
  if (typeof media === "object") {
    const candidate = (media as { url?: unknown; image?: unknown; src?: unknown }).url ??
      (media as { image?: unknown }).image ??
      (media as { src?: unknown }).src;
    if (typeof candidate === "string") return candidate;
    const images = (media as { images?: unknown }).images;
    if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  }
  return null;
}

export default function ProductCard({ product }: { product: StoreProduct }) {
  const add = useCartStore((state) => state.add);
  const priceValue = resolvePrice(product.salePrice ?? product.price);
  const basePrice = resolvePrice(product.price);
  const badge = product.type === "DIGITAL" ? "Digital" : product.stock < 5 ? "Low stock" : "In stock";
  const imageUrl = resolveImage(product.media);

  return (
    <div className="store-card store-tile-lift p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--store-accent)] via-[var(--store-violet)] to-[var(--store-pink)] opacity-70" />
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{product.category?.name ?? "Featured"}</span>
        <span className="store-chip px-2 py-0.5">{badge}</span>
      </div>

      <div className="h-28 sm:h-36 rounded-2xl border border-[var(--store-border)] bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 flex items-center justify-center text-3xl overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          "📦"
        )}
      </div>

      <div className="space-y-2">
        <Link href={`/product/${product.id}`} className="font-sora text-base font-semibold text-slate-900 hover:text-[var(--store-accent)] transition">
          {product.name}
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-900">{formatCurrency(priceValue)}</span>
          {product.salePrice && (
            <span className="text-xs text-slate-400 line-through">{formatCurrency(basePrice)}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link
          href={`/product/${product.id}`}
          className="store-outline px-2.5 sm:px-3 py-2 text-center hover:border-[var(--store-accent)] transition"
        >
          View
        </Link>
        <button
          className="store-btn-primary px-2.5 sm:px-3 py-2"
          onClick={() =>
            add({
              productId: product.id,
              name: product.name,
              price: priceValue,
              qty: 1,
            })
          }
        >
          Add
        </button>
      </div>
    </div>
  );
}
