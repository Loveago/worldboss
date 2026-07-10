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

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const topCategories = useMemo(() => categories.filter((category) => !category.parentId), [categories]);
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
    <div className="space-y-5 md:space-y-6">
      <section className="kb-cosmos-panel p-5 md:p-7">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-2xl">
            <span className="kb-chip bg-white/10 text-white border border-white/15">Shop collection</span>
            <h1 className="font-sora text-[1.75rem] leading-[1.05] md:text-3xl text-white">Build your next drop.</h1>
            <p className="text-[13px] md:text-sm text-white/70">
              Curated accessories, creative kits, and instant digital bundles tailored for busy teams.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            <Link href="/cart" className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-center text-white hover:bg-white/15 transition">
              View cart
            </Link>
            <Link href="/categories" className="store-btn-primary px-4 py-2.5 text-sm text-center">
              Categories
            </Link>
          </div>
        </div>
      </section>

      <section className="hidden md:grid sm:grid-cols-3 gap-3">
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Total products</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{totalProducts}</div>
          <div className="text-xs text-slate-500">Available in store</div>
        </div>
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Showing now</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{filteredProducts.length}</div>
          <div className="text-xs text-slate-500">For selected filter</div>
        </div>
        <div className="store-metric px-4 py-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Categories</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{categoriesCount}</div>
          <div className="text-xs text-slate-500">Collections available</div>
        </div>
      </section>

      <section className="md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <div className="store-metric px-2.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Products</div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">{totalProducts}</div>
          </div>
          <div className="store-metric px-2.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Showing</div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">{filteredProducts.length}</div>
          </div>
          <div className="store-metric px-2.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Categories</div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">{categoriesCount}</div>
          </div>
        </div>
      </section>

      <section className="store-card p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-sora text-lg text-slate-900">Filter by category</h2>
          <Link href="/categories" className="text-xs text-[var(--store-accent)] font-medium">
            Browse categories
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 text-sm rounded-full border transition whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-[var(--store-accent)] text-white border-transparent shadow-[0_8px_18px_rgba(99,102,241,0.28)]"
                : "border-[var(--store-border)] text-slate-600 bg-white hover:border-[var(--store-accent)]/40"
            }`}
          >
            All products
          </button>
          {displayCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.slug)}
              className={`px-3 py-1.5 text-sm rounded-full border transition whitespace-nowrap ${
                selectedCategory === category.slug
                  ? "bg-[var(--store-accent)] text-white border-transparent shadow-[0_8px_18px_rgba(99,102,241,0.28)]"
                  : "border-[var(--store-border)] text-slate-600 bg-white hover:border-[var(--store-accent)]/40"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      {productError && <div className="store-card p-4 text-sm text-rose-600 border border-rose-200 bg-rose-50">{productError}</div>}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {canLoadMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="store-btn-primary px-5 py-2.5 text-sm"
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
