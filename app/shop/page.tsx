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
  const totalProducts = products.length;
  const categoriesCount = displayCategories.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory]);

  const productError = productsQuery.isError
    ? productsQuery.error instanceof Error
      ? productsQuery.error.message
      : "Unable to load products right now."
    : null;

  return (
    <div className="space-y-6">
      <section className="store-glass p-5 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,165,233,0.04)_45%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-2xl">
            <span className="store-pill px-3 py-1 text-xs">Shop collection</span>
            <h1 className="font-sora text-2xl md:text-3xl text-slate-900">Build your next drop.</h1>
            <p className="text-sm text-slate-600">
              Curated accessories, creative kits, and instant digital bundles tailored for busy teams.
            </p>
          </div>
          <Link href="/cart" className="store-outline px-4 py-2 text-sm w-fit bg-white/80">
            View cart
          </Link>
        </div>
      </section>

      <section className="store-card p-0 overflow-hidden">
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Total products</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{totalProducts}</div>
            <div className="text-xs text-slate-500">Available in store</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Showing now</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{filteredProducts.length}</div>
            <div className="text-xs text-slate-500">For selected filter</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Categories</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{categoriesCount}</div>
            <div className="text-xs text-slate-500">Collections available</div>
          </div>
        </div>
      </section>

      <section className="store-card p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-sora text-lg text-slate-900">Filter by category</h2>
          <Link href="/categories" className="text-xs text-[var(--store-accent)]">
            Browse categories
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 text-sm rounded-full border transition ${
              selectedCategory === "all"
                ? "bg-[var(--store-accent)] text-white border-transparent"
                : "border-[var(--store-border)] text-slate-600 bg-white"
            }`}
          >
            All products
          </button>
          {displayCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.slug)}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                selectedCategory === category.slug
                  ? "bg-[var(--store-accent)] text-white border-transparent"
                  : "border-[var(--store-border)] text-slate-600 bg-white"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

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
