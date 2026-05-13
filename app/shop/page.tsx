"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import ProductCard, { StoreProduct } from "../store-ui/components/ProductCard";

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

const PAGE_SIZE = 9;

const fallbackCategories: StoreCategory[] = [
  { id: "phone-essentials", name: "Phone Essentials", slug: "phone-essentials" },
  { id: "laptop-studio", name: "Laptop Studio", slug: "laptop-studio" },
  { id: "creator-kits", name: "Creator Kits", slug: "creator-kits" },
  { id: "audio-wear", name: "Audio & Wearables", slug: "audio-wear" },
  { id: "print-packs", name: "Print Packs", slug: "print-packs" },
  { id: "data-bundles", name: "Data Bundles", slug: "data-bundles" },
];

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const productsQuery = useQuery<StoreProduct[]>({
    queryKey: ["store-products"],
    queryFn: () => apiFetch<StoreProduct[]>("/api/products"),
  });

  const categoriesQuery = useQuery<StoreCategory[]>({
    queryKey: ["store-categories"],
    queryFn: () => apiFetch<StoreCategory[]>("/api/categories"),
  });

  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const topCategories = categories.filter((category) => !category.parentId);
  const hasCategories = categories.length > 0;
  const displayCategories = topCategories.length ? topCategories : hasCategories ? categories : fallbackCategories;

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products;
    return products.filter((product) => product.category?.slug === selectedCategory);
  }, [products, selectedCategory]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const canLoadMore = filteredProducts.length > visibleCount;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory]);

  const productError = productsQuery.isError
    ? productsQuery.error instanceof Error
      ? productsQuery.error.message
      : "Unable to load products right now."
    : null;

  return (
    <div className="space-y-8">
      <section className="store-hero p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-16 left-6 h-28 w-28 rounded-full bg-emerald-100 blur-3xl opacity-70 store-glow" />
        <div className="absolute -bottom-20 right-10 h-36 w-36 rounded-full bg-amber-100 blur-3xl opacity-70 store-glow" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-2xl">
            <span className="store-pill px-3 py-1 text-xs">Shop the collection</span>
            <h1 className="font-sora text-2xl md:text-3xl text-slate-900">Build your next drop.</h1>
            <p className="text-sm text-slate-600">
              Curated accessories, creative kits, and instant digital bundles tailored for busy teams.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="store-outline px-3 py-1">New arrivals</span>
              <span className="store-outline px-3 py-1">Editor picks</span>
              <span className="store-outline px-3 py-1">Limited kits</span>
            </div>
          </div>
          <Link href="/cart" className="store-outline px-4 py-2 text-sm w-fit">
            View cart
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1 text-sm rounded-full border transition ${
            selectedCategory === "all"
              ? "bg-[var(--store-accent)] text-white border-transparent"
              : "border-[var(--store-border)] text-slate-600"
          }`}
        >
          All products
        </button>
        {displayCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedCategory(category.slug)}
            className={`px-3 py-1 text-sm rounded-full border transition ${
              selectedCategory === category.slug
                ? "bg-[var(--store-accent)] text-white border-transparent"
                : "border-[var(--store-border)] text-slate-600"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {productError && <div className="store-card p-4 text-sm text-rose-600">{productError}</div>}

      {productsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="store-card p-4 space-y-4 animate-pulse">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-28 rounded-2xl bg-slate-100" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-200 rounded" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-9 bg-slate-100 rounded-full" />
                <div className="h-9 bg-slate-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleProducts.length ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {canLoadMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="store-outline px-4 py-2 text-sm"
              >
                Load more
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="store-card p-4 text-sm text-slate-500">No products yet. Check back soon.</div>
      )}
    </div>
  );
}
