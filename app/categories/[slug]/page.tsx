"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import ProductCard, { StoreProduct } from "../../store-ui/components/ProductCard";

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : "";

  const categoriesQuery = useQuery<StoreCategory[]>({
    queryKey: ["store-categories"],
    queryFn: () => apiFetch<StoreCategory[]>("/api/categories"),
  });

  const productsQuery = useQuery<StoreProduct[]>({
    queryKey: ["store-products"],
    queryFn: () => apiFetch<StoreProduct[]>("/api/products"),
  });

  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];

  const category = useMemo(
    () => categories.find((item) => item.slug === slug) || null,
    [categories, slug]
  );

  const relatedProducts = useMemo(() => {
    if (!category) return [];
    return products.filter((product) => product.category?.slug === category.slug);
  }, [category, products]);
  const totalProducts = relatedProducts.length;

  const errorMessage = categoriesQuery.isError
    ? categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : "Unable to load categories right now."
    : null;

  return (
    <div className="space-y-5 md:space-y-6">
      <section className="store-glass p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,165,233,0.04)_45%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-sora text-[1.7rem] leading-[1.04] md:text-3xl text-slate-900">{category ? category.name : "Category"}</h1>
            <p className="text-[13px] md:text-sm text-slate-600">
              {category ? "Browse the latest picks in this category." : "Select a category to explore products."}
            </p>
          </div>
          <Link href="/categories" className="store-outline px-4 py-2.5 text-sm w-fit bg-white/85">
            All categories
          </Link>
        </div>
      </section>

      <section className="store-card p-0 overflow-hidden hidden md:block">
        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Category status</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{category ? "Found" : "Missing"}</div>
            <div className="text-xs text-slate-500">Slug: {slug || "-"}</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Products in category</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{totalProducts}</div>
            <div className="text-xs text-slate-500">Matching storefront items</div>
          </div>
        </div>
      </section>

      <section className="md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <div className="store-card px-2.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Status</div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">{category ? "Found" : "Missing"}</div>
          </div>
          <div className="store-card px-2.5 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Products</div>
            <div className="text-sm font-semibold text-slate-900 mt-0.5">{totalProducts}</div>
          </div>
        </div>
      </section>

      {errorMessage && <div className="store-card p-4 text-sm text-rose-600">{errorMessage}</div>}

      {(categoriesQuery.isLoading || productsQuery.isLoading) && (
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="store-card p-4 space-y-4 animate-pulse">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-28 rounded-2xl bg-slate-100" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!categoriesQuery.isLoading && !productsQuery.isLoading && category && relatedProducts.length === 0 && (
        <div className="store-card p-4 text-sm text-slate-500">No products found in this category.</div>
      )}

      {!categoriesQuery.isLoading && !productsQuery.isLoading && category && relatedProducts.length > 0 && (
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {relatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {!categoriesQuery.isLoading && !productsQuery.isLoading && !category && (
        <div className="store-card p-4 text-sm text-slate-500">Category not found.</div>
      )}
    </div>
  );
}
