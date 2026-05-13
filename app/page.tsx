"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import ProductCard, { StoreProduct } from "./store-ui/components/ProductCard";

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: StoreCategory[];
};

type CategoryTheme = {
  tag: string;
  description: string;
  gradient: string;
  badge: string;
  icon: string;
};

const fallbackCategories: StoreCategory[] = [
  { id: "phone-essentials", name: "Phone Essentials", slug: "phone-essentials" },
  { id: "laptop-studio", name: "Laptop Studio", slug: "laptop-studio" },
  { id: "creator-kits", name: "Creator Kits", slug: "creator-kits" },
  { id: "audio-wear", name: "Audio & Wearables", slug: "audio-wear" },
  { id: "print-packs", name: "Print Packs", slug: "print-packs" },
  { id: "data-bundles", name: "Data Bundles", slug: "data-bundles" },
];

const categoryThemes: CategoryTheme[] = [
  {
    tag: "Daily carry",
    description: "Cases, grips, chargers, and everyday add-ons.",
    gradient: "bg-gradient-to-br from-amber-50 via-white to-orange-100",
    badge: "bg-amber-100 text-amber-700",
    icon: "📱",
  },
  {
    tag: "Workspace",
    description: "Docking, cables, and desk-ready laptop gear.",
    gradient: "bg-gradient-to-br from-sky-50 via-white to-cyan-100",
    badge: "bg-sky-100 text-sky-700",
    icon: "💻",
  },
  {
    tag: "Creators",
    description: "Content-ready kits for social and branding.",
    gradient: "bg-gradient-to-br from-rose-50 via-white to-pink-100",
    badge: "bg-rose-100 text-rose-700",
    icon: "🎥",
  },
  {
    tag: "Audio",
    description: "Headsets, smart wearables, and studio sound.",
    gradient: "bg-gradient-to-br from-emerald-50 via-white to-lime-100",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "🎧",
  },
  {
    tag: "Print lab",
    description: "Flyers, labels, and packaging mockups.",
    gradient: "bg-gradient-to-br from-amber-50 via-white to-amber-100",
    badge: "bg-amber-100 text-amber-700",
    icon: "🖨️",
  },
  {
    tag: "Stay online",
    description: "Quick top-ups and network bundles.",
    gradient: "bg-gradient-to-br from-indigo-50 via-white to-violet-100",
    badge: "bg-indigo-100 text-indigo-700",
    icon: "📶",
  },
];

const heroHighlights = [
  {
    badge: "NEW",
    icon: "🌀",
    title: "New arrivals weekly",
    copy: "Best sellers, bundles, and limited kits.",
  },
  {
    badge: "⚡",
    icon: "📦",
    title: "Instant downloads",
    copy: "Secure checkout with immediate access.",
  },
  {
    badge: "⚡",
    icon: "📶",
    title: "Top-up in minutes",
    copy: "MTN, Telecel, and AirtelTigo.",
  },
  {
    badge: "💖",
    icon: "🎨",
    title: "Design concierge",
    copy: "Get bespoke visuals & assets fast.",
  },
];

export default function Page() {
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
  const themedCategories = useMemo(
    () =>
      displayCategories.map((category, index) => ({
        ...category,
        theme: categoryThemes[index % categoryThemes.length],
      })),
    [displayCategories]
  );
  const featuredProducts = products.slice(0, 6);
  const productError = productsQuery.isError
    ? productsQuery.error instanceof Error
      ? productsQuery.error.message
      : "Unable to load products right now."
    : null;
  const categoryError = categoriesQuery.isError
    ? categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : "Unable to load categories right now."
    : null;
  const categoryCountLabel = (index: number) => `${(index + 1) * 60}+ items`;

  return (
    <div className="space-y-12">
      <section className="store-hero p-5 md:p-8 xl:p-10 relative overflow-hidden">
        <div className="absolute -top-16 -left-10 h-32 w-32 rounded-full bg-fuchsia-200 blur-3xl opacity-70 store-glow" />
        <div className="absolute -bottom-24 right-10 h-40 w-40 rounded-full bg-sky-200 blur-3xl opacity-70 store-glow" />
        <div className="relative z-10 grid gap-6 xl:gap-7 xl:grid-cols-[1fr_minmax(340px,0.92fr)_minmax(260px,0.72fr)] xl:items-stretch">
          <div className="space-y-5">
            <span className="store-pill px-3 py-1 text-xs">Welcome to Boss Market 👋</span>
            <h1 className="font-sora text-4xl md:text-5xl text-slate-900 leading-[1.06]">
              Discover. Download.
              <br />
              <span className="text-[var(--store-accent)]">Level up.</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-xl">
              Curated gadgets, digital kits, templates, and data bundles delivered fast — so you can focus on what
              matters.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="store-outline px-3 py-1">⚡ Instant downloads</span>
              <span className="store-outline px-3 py-1">🔒 Secure checkout</span>
              <span className="store-outline px-3 py-1">⭐ Top quality</span>
              <span className="store-outline px-3 py-1">💜 Creator support</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-full bg-[var(--store-accent)] text-white px-5 py-2.5 text-sm shadow-[0_14px_26px_rgba(91,92,230,0.3)]"
              >
                Shop products
              </Link>
              <Link href="/request-design" className="store-outline px-5 py-2.5 text-sm">
                Request a design
              </Link>
              <Link href="/data" className="store-outline px-5 py-2.5 text-sm">
                Buy data
              </Link>
            </div>
          </div>

          <div className="store-card p-6 md:p-8 relative overflow-hidden min-h-[300px] md:min-h-[320px] xl:h-full flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-100/70 via-white to-indigo-100/80" />
            <div className="absolute -top-7 right-8 h-20 w-20 rounded-3xl bg-white/90 shadow-[0_18px_34px_rgba(91,92,230,0.2)] flex items-center justify-center text-3xl store-float">
              📱
            </div>
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-3xl bg-white/90 shadow-[0_18px_34px_rgba(91,92,230,0.22)] flex items-center justify-center text-4xl store-float" style={{ animationDelay: "0.9s" }}>
              📦
            </div>
            <div className="relative z-10 text-center space-y-4">
              <div className="text-7xl store-float">⚡</div>
              <p className="text-sm text-slate-600">Curated box drops, templates, and instant bundles.</p>
            </div>
          </div>

          <div className="grid gap-3 xl:h-full content-start">
            {heroHighlights.map((card, index) => (
              <div
                key={card.title}
                className="store-card p-4 bg-white/80 space-y-2 store-fade-up min-h-[92px]"
                style={{ animationDelay: `${120 + index * 120}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{card.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{card.copy}</div>
                    </div>
                  </div>
                  <span className="store-outline px-2 py-0.5 text-[10px]">{card.badge}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-sora text-xl text-slate-900">Explore top categories ✨</h2>
            <p className="text-sm text-slate-600">Discover best sellers by collection.</p>
          </div>
          <Link href="/categories" className="text-sm text-[var(--store-accent)]">
            View all categories
          </Link>
        </div>
        {categoryError && <div className="store-card p-4 text-sm text-rose-600">{categoryError}</div>}
        {categoriesQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="store-card p-4 space-y-3 animate-pulse">
                <div className="h-10 w-10 bg-slate-200 rounded-2xl" />
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-6 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : themedCategories.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {themedCategories.map((category, index) => (
              <Link
                key={category.id}
                href={hasCategories ? `/categories/${category.slug}` : "/shop"}
                className="store-card p-4 relative overflow-hidden transition hover:-translate-y-1 min-h-[158px]"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className={`absolute inset-0 opacity-70 ${category.theme.gradient}`} />
                <div className="relative z-10 space-y-3 store-fade-up">
                  <div className="text-4xl" aria-hidden>
                    {category.theme.icon}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 font-sora leading-tight">{category.name}</div>
                  <div className="text-xs text-slate-600">{categoryCountLabel(index)}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="store-card p-4 text-sm text-slate-500">No categories yet. Check back soon.</div>
        )}
      </section>

      <section className="space-y-4">
        <div className="store-glass p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sora text-xl text-slate-900">Featured picks</h2>
              <p className="text-sm text-slate-600">New arrivals, best sellers, and quick-buy essentials.</p>
            </div>
            <Link href="/shop" className="text-sm text-[var(--store-accent)] font-medium">
              Browse all
            </Link>
          </div>

          {!productsQuery.isLoading && featuredProducts.length > 0 && (
            <div className="store-card p-5 md:p-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr] relative overflow-hidden">
              <div className="absolute -top-20 right-4 h-36 w-36 rounded-full bg-fuchsia-100 blur-3xl opacity-70" />
              <div className="absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-sky-100 blur-3xl opacity-70" />

              <div className="relative z-10 space-y-4">
                <span className="store-pill px-3 py-1 text-xs inline-flex">Featured now</span>
                <h3 className="font-sora text-2xl text-slate-900 leading-tight">Shop trending products this week</h3>
                <p className="text-sm text-slate-600 max-w-md">
                  Handpicked items with fast checkout and instant delivery options across gadgets, templates, and data.
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="store-outline px-3 py-1">Fast delivery</span>
                  <span className="store-outline px-3 py-1">Secure checkout</span>
                  <span className="store-outline px-3 py-1">Top quality</span>
                </div>
                <Link
                  href="/shop"
                  className="rounded-full bg-[var(--store-accent)] text-white px-5 py-2.5 text-sm inline-flex shadow-[0_14px_28px_rgba(91,92,230,0.32)]"
                >
                  Shop featured
                </Link>
              </div>

              <div className="relative z-10 grid gap-3 sm:grid-cols-2 md:grid-cols-1 content-start">
                {featuredProducts.slice(0, 2).map((product) => (
                  <Link
                    key={`spotlight-${product.id}`}
                    href={`/product/${product.id}`}
                    className="store-outline px-4 py-3 rounded-2xl bg-white/85 hover:bg-white transition min-h-[88px]"
                  >
                    <div className="text-xs text-slate-500 mb-1">Top pick</div>
                    <div className="text-sm font-semibold text-slate-900 line-clamp-1">{product.name}</div>
                    <div className="text-xs text-slate-500 mt-1">View details</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
        ) : featuredProducts.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="store-card p-4 text-sm text-slate-500">No products yet. Add items in Admin.</div>
        )}
      </section>

      <section className="store-card px-4 py-4 md:px-6 md:py-5 grid gap-4 md:grid-cols-[1fr_auto] items-center">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center md:text-left">
          <div>
            <div className="text-sm font-semibold text-slate-900">🚚 Fast delivery</div>
            <div className="text-xs text-slate-500">Delivered instantly to you</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">🛡️ Secure & safe</div>
            <div className="text-xs text-slate-500">Your data is protected</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">💎 Premium quality</div>
            <div className="text-xs text-slate-500">Handpicked by experts</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">🫶 Creator support</div>
            <div className="text-xs text-slate-500">We&apos;re here to help</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">🌍 Global access</div>
            <div className="text-xs text-slate-500">Shop from anywhere</div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white p-4 md:min-w-[250px]">
          <div className="text-xs uppercase tracking-wide text-white/80">Become a creator</div>
          <div className="text-sm font-semibold mt-1">Sell your digital products to thousands of buyers.</div>
          <Link href="/request-design" className="mt-3 inline-flex bg-white text-indigo-600 rounded-full px-3 py-1.5 text-xs font-semibold">
            Start selling
          </Link>
        </div>
      </section>
    </div>
  );
}
