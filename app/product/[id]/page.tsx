"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { useCartStore } from "@/store/cart";
import type { StoreProduct } from "../../store-ui/components/ProductCard";

type ProductDetail = StoreProduct & {
  slug?: string;
  salePrice?: number | string | null;
  variants?: unknown;
  media?: unknown;
  specs?: unknown;
  digitalUrl?: string | null;
};

type VariantGroup = {
  name: string;
  options: string[];
};

const resolvePrice = (value?: number | string | null) => {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number(value) : value;
};

const normalizeVariants = (raw: unknown): VariantGroup[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.every((item) => typeof item === "string")) {
      return [{ name: "Variant", options: raw as string[] }];
    }
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const name = typeof (item as { name?: unknown }).name === "string" ? (item as { name: string }).name : "Variant";
        const options = Array.isArray((item as { options?: unknown }).options)
          ? (item as { options: unknown[] }).options.filter((option): option is string => typeof option === "string")
          : [];
        if (!options.length) return null;
        return { name, options } satisfies VariantGroup;
      })
      .filter((item): item is VariantGroup => Boolean(item));
  }
  if (typeof raw === "object") {
    const options = Array.isArray((raw as { options?: unknown }).options)
      ? (raw as { options: unknown[] }).options.filter((option): option is string => typeof option === "string")
      : [];
    if (options.length) {
      const name = typeof (raw as { name?: unknown }).name === "string" ? (raw as { name: string }).name : "Variant";
      return [{ name, options }];
    }
  }
  return [];
};

const normalizeSpecs = (raw: unknown): Array<{ label: string; value: string }> => {
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const label = (entry as { label?: unknown }).label;
        const value = (entry as { value?: unknown }).value;
        if (typeof label !== "string" || typeof value !== "string") return null;
        return { label, value };
      })
      .filter((entry): entry is { label: string; value: string } => Boolean(entry));
  }
  return Object.entries(raw).map(([label, value]) => ({ label, value: String(value) }));
};

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const add = useCartStore((state) => state.add);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const productQuery = useQuery<ProductDetail>({
    queryKey: ["store-product", id],
    queryFn: () => apiFetch<ProductDetail>(`/api/products/${id}`),
    enabled: Boolean(id),
  });

  const product = productQuery.data ?? null;
  const priceValue = resolvePrice(product?.salePrice ?? product?.price ?? 0);
  const basePrice = resolvePrice(product?.price ?? 0);
  const variantGroups = useMemo(() => normalizeVariants(product?.variants), [product?.variants]);
  const specs = useMemo(() => normalizeSpecs(product?.specs), [product?.specs]);
  const isOutOfStock = product ? product.stock <= 0 : false;
  const stockLabel = product ? (product.stock > 0 ? `${product.stock} in stock` : "Out of stock") : "-";

  useEffect(() => {
    if (!variantGroups.length) {
      setSelectedOptions({});
      return;
    }
    setSelectedOptions((prev) => {
      const next: Record<string, string> = { ...prev };
      variantGroups.forEach((group) => {
        if (!next[group.name]) {
          next[group.name] = group.options[0];
        }
      });
      return next;
    });
  }, [variantGroups]);

  const variantLabel = variantGroups
    .map((group) => (selectedOptions[group.name] ? `${group.name}: ${selectedOptions[group.name]}` : null))
    .filter(Boolean)
    .join(" / ");

  const handleAdd = () => {
    if (!product || isOutOfStock) return;
    add({
      productId: product.id,
      name: product.name,
      price: priceValue,
      qty: 1,
      variant: variantLabel || null,
    });
  };

  const errorMessage = productQuery.isError
    ? productQuery.error instanceof Error
      ? productQuery.error.message
      : "Unable to load product right now."
    : null;

  return (
    <div className="space-y-6">
      <section className="store-glass p-5 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,165,233,0.04)_45%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-sora text-2xl text-slate-900">{product?.name ?? "Product"}</h1>
            <p className="text-sm text-slate-600">{product?.category?.name ?? "Store item"}</p>
          </div>
          <Link href="/shop" className="store-outline px-4 py-2 text-sm w-fit bg-white/80">
            Back to shop
          </Link>
        </div>
      </section>

      <section className="store-card p-0 overflow-hidden">
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Current price</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(priceValue)}</div>
            <div className="text-xs text-slate-500">Product rate</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Stock status</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{isOutOfStock ? "Out" : "In"}</div>
            <div className="text-xs text-slate-500">{stockLabel}</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Type</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{product?.type === "DIGITAL" ? "Digital" : "Physical"}</div>
            <div className="text-xs text-slate-500">Fulfillment mode</div>
          </div>
        </div>
      </section>

      {productQuery.isLoading && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="store-card p-6 space-y-4 lg:col-span-2 animate-pulse">
            <div className="h-6 w-40 bg-slate-200 rounded" />
            <div className="h-64 rounded-2xl bg-slate-100" />
          </div>
          <div className="store-card p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded" />
          </div>
        </div>
      )}

      {errorMessage && <div className="store-card p-4 text-sm text-rose-600">{errorMessage}</div>}

      {!productQuery.isLoading && !errorMessage && product && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="store-card p-6 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{product.type === "DIGITAL" ? "Digital download" : "Physical item"}</span>
                <span className="store-chip px-2 py-0.5">
                  {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                </span>
              </div>
              <div className="h-64 rounded-3xl border border-[var(--store-border)] bg-gradient-to-br from-amber-50 via-white to-emerald-50 flex items-center justify-center text-4xl">
                📦
              </div>
              {specs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-900">Product details</div>
                  <div className="grid gap-2 text-sm text-slate-600">
                    {specs.map((spec) => (
                      <div key={spec.label} className="flex items-center justify-between">
                        <span>{spec.label}</span>
                        <span className="font-medium text-slate-900">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="store-card p-6 space-y-4">
                <div>
                  <div className="text-xs text-slate-500">Price</div>
                  <div className="text-xl font-semibold text-slate-900">{formatCurrency(priceValue)}</div>
                  {product.salePrice && (
                    <div className="text-xs text-slate-400 line-through">{formatCurrency(basePrice)}</div>
                  )}
                </div>

                {variantGroups.length > 0 && (
                  <div className="space-y-3">
                    {variantGroups.map((group) => (
                      <div key={group.name} className="space-y-2">
                        <div className="text-xs text-slate-500">{group.name}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.options.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [group.name]: option,
                                }))
                              }
                              className={`px-3 py-1 text-xs rounded-full border transition ${
                                selectedOptions[group.name] === option
                                  ? "bg-[var(--store-accent)] text-white border-transparent"
                                  : "border-[var(--store-border)] text-slate-600"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={isOutOfStock}
                    className={`rounded-full px-4 py-2 text-sm text-white ${
                      isOutOfStock
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-[var(--store-accent)] hover:brightness-95"
                    }`}
                  >
                    {isOutOfStock ? "Out of stock" : "Add to cart"}
                  </button>
                  <Link href="/cart" className="store-outline px-4 py-2 text-sm text-center">
                    Go to cart
                  </Link>
                </div>
              </div>

              <div className="store-card p-5 space-y-2 text-sm text-slate-600">
                <div className="text-xs text-slate-500">Fulfillment</div>
                <p>
                  {product.type === "DIGITAL"
                    ? "Digital products are delivered instantly after payment."
                    : "Orders are processed within 24 hours and shipped with tracking."}
                </p>
                {product.digitalUrl && product.type === "DIGITAL" && (
                  <span className="store-pill px-2 py-0.5 text-xs">Secure download link</span>
                )}
              </div>
            </div>
          </div>

          <div className="md:hidden fixed bottom-24 left-4 right-4 z-40">
            <div className="store-glass px-4 py-3 flex items-center justify-between gap-3 border border-white/70 shadow-[0_22px_40px_rgba(52,63,126,0.22)]">
              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-base font-semibold text-slate-900">{formatCurrency(priceValue)}</div>
                {variantLabel && <div className="text-[11px] text-slate-500">{variantLabel}</div>}
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={isOutOfStock}
                className={`rounded-full px-4 py-2 text-sm text-white ${
                  isOutOfStock ? "bg-slate-400 cursor-not-allowed" : "bg-[var(--store-accent)]"
                }`}
              >
                {isOutOfStock ? "Out" : "Add"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
