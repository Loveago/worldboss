"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

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
  glow: string;
};

const fallbackCategories: StoreCategory[] = [
  { id: "phone-essentials", name: "Phone Essentials", slug: "phone-essentials" },
  { id: "laptop-studio", name: "Laptop Studio", slug: "laptop-studio" },
  { id: "creator-kits", name: "Creator Kits", slug: "creator-kits" },
  { id: "audio-wear", name: "Audio & Wearables", slug: "audio-wear" },
  { id: "print-packs", name: "Print Packs", slug: "print-packs" },
  { id: "data-bundles", name: "Data Bundles", slug: "data-bundles" },
  { id: "office-essentials", name: "Office Essentials", slug: "office-essentials" },
  { id: "event-visuals", name: "Event Visuals", slug: "event-visuals" },
];

const categoryThemes: CategoryTheme[] = [
  {
    tag: "Daily carry",
    description: "Cases, grips, chargers, and everyday add-ons.",
    gradient: "bg-gradient-to-br from-amber-50 via-white to-orange-100",
    badge: "bg-amber-100 text-amber-700",
    icon: "📱",
    glow: "bg-orange-200",
  },
  {
    tag: "Workspace",
    description: "Docking, cables, and desk-ready laptop gear.",
    gradient: "bg-gradient-to-br from-sky-50 via-white to-cyan-100",
    badge: "bg-sky-100 text-sky-700",
    icon: "💻",
    glow: "bg-sky-200",
  },
  {
    tag: "Creators",
    description: "Content-ready kits for social and branding.",
    gradient: "bg-gradient-to-br from-rose-50 via-white to-pink-100",
    badge: "bg-rose-100 text-rose-700",
    icon: "🎥",
    glow: "bg-rose-200",
  },
  {
    tag: "Audio",
    description: "Headsets, smart wearables, and studio sound.",
    gradient: "bg-gradient-to-br from-emerald-50 via-white to-lime-100",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "🎧",
    glow: "bg-emerald-200",
  },
  {
    tag: "Print lab",
    description: "Flyers, labels, and packaging mockups.",
    gradient: "bg-gradient-to-br from-amber-50 via-white to-amber-100",
    badge: "bg-amber-100 text-amber-700",
    icon: "🖨️",
    glow: "bg-amber-200",
  },
  {
    tag: "Stay online",
    description: "Quick top-ups and network bundles.",
    gradient: "bg-gradient-to-br from-indigo-50 via-white to-violet-100",
    badge: "bg-indigo-100 text-indigo-700",
    icon: "📶",
    glow: "bg-indigo-200",
  },
  {
    tag: "Essentials",
    description: "Organizers, stationery, and office basics.",
    gradient: "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    badge: "bg-slate-100 text-slate-600",
    icon: "🧩",
    glow: "bg-slate-200",
  },
  {
    tag: "Events",
    description: "Launch kits and branded event visuals.",
    gradient: "bg-gradient-to-br from-fuchsia-50 via-white to-pink-100",
    badge: "bg-fuchsia-100 text-fuchsia-700",
    icon: "🎉",
    glow: "bg-fuchsia-200",
  },
];

const summarizeChildren = (children?: StoreCategory[]) => {
  if (!children?.length) return null;
  return children
    .map((child) => child.name)
    .slice(0, 3)
    .join(", ");
};

export default function CategoriesPage() {
  const categoriesQuery = useQuery<StoreCategory[]>({
    queryKey: ["store-categories"],
    queryFn: () => apiFetch<StoreCategory[]>("/api/categories"),
  });

  const categories = categoriesQuery.data ?? [];
  const topCategories = categories.filter((category) => !category.parentId);
  const hasCategories = categories.length > 0;
  const displayCategories = topCategories.length ? topCategories : hasCategories ? categories : fallbackCategories;
  const themedCategories = useMemo(
    () =>
      displayCategories.map((category, index) => {
        const theme = categoryThemes[index % categoryThemes.length];
        const childSummary = summarizeChildren(category.children);
        return {
          ...category,
          theme,
          blurb: childSummary ? `Subcategories: ${childSummary}` : theme.description,
          childCount: category.children?.length ?? 0,
        };
      }),
    [displayCategories]
  );

  const errorMessage = categoriesQuery.isError
    ? categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : "Unable to load categories right now."
    : null;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden store-card p-6 md:p-8">
        <div className="absolute -top-20 right-4 h-40 w-40 rounded-full bg-amber-100 blur-3xl opacity-70 store-glow" />
        <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-emerald-100 blur-3xl opacity-70 store-glow" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-4">
            <span className="store-pill px-3 py-1 text-xs">Storefront categories</span>
            <h1 className="font-sora text-2xl md:text-3xl text-slate-900">
              Discover collections made for your workflow.
            </h1>
            <p className="text-sm md:text-base text-slate-600">
              Explore curated bundles for creators, teams, and everyday essentials. Browse the collections or jump
              straight into the shop.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop" className="rounded-full bg-[var(--store-accent)] text-white px-4 py-2 text-sm">
                Browse all products
              </Link>
              <Link href="/request-design" className="store-outline px-4 py-2 text-sm">
                Request a design
              </Link>
            </div>
            {categoriesQuery.isLoading && !hasCategories && (
              <div className="text-xs text-slate-500">Syncing live categories...</div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className="store-card p-4 bg-white/80 space-y-2 store-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              <div className="text-xs text-slate-500">Spotlight</div>
              <div className="text-lg font-semibold text-slate-900">Creator-ready drops</div>
              <div className="text-xs text-slate-500">Updated weekly with new merch.</div>
            </div>
            <div
              className="store-card p-4 bg-white/80 space-y-2 store-fade-up"
              style={{ animationDelay: "220ms" }}
            >
              <div className="text-xs text-slate-500">Data hub</div>
              <div className="text-lg font-semibold text-slate-900">Instant bundles</div>
              <div className="text-xs text-slate-500">Top up MTN, Telecel &amp; AirtelTigo.</div>
            </div>
          </div>
        </div>
      </section>

      {errorMessage && <div className="store-card p-4 text-sm text-rose-600">{errorMessage}</div>}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-sora text-xl text-slate-900">Browse categories</h2>
            <p className="text-sm text-slate-600">Pick a vibe and start exploring.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themedCategories.map((category, index) => (
            <Link
              key={category.id}
              href={hasCategories ? `/categories/${category.slug}` : "/shop"}
              className="group relative overflow-hidden store-card p-5 transition hover:-translate-y-1"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition ${category.theme.gradient}`} />
              <div
                className={`absolute -top-16 -right-10 h-28 w-28 rounded-full blur-3xl opacity-60 ${category.theme.glow} store-glow`}
              />
              <div className="relative z-10 space-y-4 store-fade-up">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${category.theme.badge}`}>
                    {category.theme.tag}
                  </span>
                  <span className="text-xl store-float" aria-hidden>
                    {category.theme.icon}
                  </span>
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900 font-sora">{category.name}</div>
                  <div className="text-sm text-slate-600 mt-1">{category.blurb}</div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{category.childCount ? `${category.childCount} subcategories` : "Curated picks"}</span>
                  <span className="store-outline px-3 py-1 text-xs group-hover:border-slate-400">Explore</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
