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

  const errorMessage = categoriesQuery.isError
    ? categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : "Unable to load categories right now."
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-sora text-2xl text-slate-900">
            {category ? category.name : "Category"}
          </h1>
          <p className="text-sm text-slate-600">
            {category ? "Browse the latest picks in this category." : "Select a category to explore products."}
          </p>
        </div>
        <Link href="/categories" className="store-outline px-4 py-2 text-sm w-fit">
          All categories
        </Link>
      </div>

      {errorMessage && <div className="store-card p-4 text-sm text-rose-600">{errorMessage}</div>}

      {(categoriesQuery.isLoading || productsQuery.isLoading) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
