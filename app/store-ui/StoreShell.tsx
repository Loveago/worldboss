"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCartStore } from "@/store/cart";

const navItems = [
  { label: "Explore", href: "/", icon: "✨" },
  { label: "Shop", href: "/shop", icon: "🛍️" },
  { label: "Categories", href: "/categories", icon: "🧭" },
  { label: "Data", href: "/data", icon: "📶" },
  { label: "Profile", href: "/profile", icon: "👤" },
  { label: "Request Design", href: "/request-design", icon: "🎨" },
];

const bottomNav = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Shop", href: "/shop", icon: "🛍️" },
  { label: "Profile", href: "/profile", icon: "�" },
  { label: "Data", href: "/data", icon: "📶" },
  { label: "Cart", href: "/cart", icon: "🧺" },
];

type AuthProfile = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  name?: string | null;
  phone?: string | null;
  createdAt?: string;
};

export default function StoreShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const items = useCartStore((state) => state.items);
  const cartCount = items.reduce((sum, item) => sum + item.qty, 0);
  const isActive = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href));

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 12) {
        setShowHeader(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const delta = currentScrollY - lastScrollY.current;
      if (Math.abs(delta) < 6) return;

      setShowHeader(delta < 0);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const profileQuery = useQuery<AuthProfile>({
    queryKey: ["auth-profile"],
    queryFn: () => apiFetch<AuthProfile>("/api/auth/profile"),
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ loggedOut: boolean }>("/api/auth/logout", {
        method: "POST",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth-profile"] }),
  });

  const user = profileQuery.isSuccess ? profileQuery.data : null;
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="store-shell min-h-screen">
      <header
        className={`sticky top-0 z-50 bg-[linear-gradient(180deg,rgba(246,244,255,0.96),rgba(246,244,255,0.84)_74%,rgba(246,244,255,0))] backdrop-blur-md transition-transform duration-300 ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-3 pb-3">
          <div className="store-glass store-grid-bg px-4 py-4 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -top-20 right-4 h-32 w-32 rounded-full bg-fuchsia-100 blur-3xl opacity-70 store-glow" />
            <div className="absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-sky-100 blur-3xl opacity-70 store-glow" />

            <div className="relative z-10 grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <div className="flex items-center gap-2.5">
                <Link href="/" className="font-sora text-lg md:text-xl font-semibold flex items-center gap-2">
                  <span className="text-base" aria-hidden>
                    ⚡
                  </span>
                  <span>Boss Market</span>
                </Link>
                <span className="store-pill px-2 py-0.5 text-[10px]">Live</span>
              </div>

              <div className="hidden lg:flex items-center gap-3 min-w-0">
                <label className="store-outline flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 bg-white/92 shadow-[0_8px_18px_rgba(74,85,130,0.08)] lg:min-w-[240px] xl:min-w-[300px]">
                  <span className="text-sm">🔎</span>
                  <input
                    className="flex-1 bg-transparent text-sm outline-none"
                    placeholder="Search gadgets, templates, data bundles..."
                  />
                  <span className="store-outline px-1.5 py-0.5 text-[10px] text-slate-500">⌘ K</span>
                </label>

                <div className="hidden 2xl:flex items-center gap-1.5 text-sm text-slate-600">
                  {navItems.map((item) => (
                    <Link key={`top-${item.href}`} href={item.href} className="px-2.5 py-1.5 rounded-full hover:bg-white transition">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-start lg:justify-end gap-2 md:gap-2.5 overflow-x-auto lg:overflow-visible no-scrollbar max-w-full pb-1">
                {isAdmin && (
                  <Link href="/admin/dashboard" className="store-outline px-3 py-1.5 text-xs font-medium shrink-0">
                    Admin
                  </Link>
                )}
                {user ? (
                  <>
                    <span className="text-xs text-slate-600 hidden sm:inline shrink-0">Hi, {user.name || user.email.split("@")[0]}</span>
                    <Link href="/profile" className="store-outline px-3 py-1.5 text-xs font-medium shrink-0">
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isLoading}
                      className="store-outline px-3 py-1.5 text-xs font-medium shrink-0"
                    >
                      {logoutMutation.isLoading ? "Signing out..." : "Sign out"}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="store-outline px-3 py-1.5 text-xs font-medium shrink-0">
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="px-3 py-1.5 rounded-full text-xs bg-[var(--store-accent)] text-white shadow-[0_10px_20px_rgba(91,92,230,0.35)] shrink-0"
                    >
                      Create account
                    </Link>
                  </>
                )}
                <Link href="/cart" className="store-outline px-3 py-1.5 text-xs flex items-center gap-2 font-medium shrink-0">
                  <span>🧺 Cart</span>
                  {cartCount > 0 && <span className="store-pill px-2 py-0.5 text-[10px]">{cartCount}</span>}
                </Link>
              </div>
            </div>

            <div className="relative z-10 flex flex-col gap-3 lg:hidden">
              <label className="store-outline flex-1 flex items-center gap-2 px-3 py-2.5 bg-white/90 shadow-[0_6px_16px_rgba(74,85,130,0.08)]">
                <span className="text-sm">🔎</span>
                <input
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="Search gadgets, templates, data bundles..."
                />
                <span className="store-pill px-2 py-0.5 text-[10px] hidden sm:inline">Explore</span>
                <span className="store-outline px-1.5 py-0.5 text-[10px] text-slate-500 hidden sm:inline">⌘ K</span>
              </label>
            </div>
          </div>

          <nav className="hidden md:flex items-center justify-center gap-2 text-sm mt-3 px-1 relative z-10">
            <div className="store-glass px-2 py-1.5 flex items-center gap-2 w-fit">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition font-medium ${
                    isActive(item.href)
                      ? "bg-[var(--store-accent)] text-white shadow-[0_10px_20px_rgba(91,92,230,0.32)]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 md:py-8 pb-28">{children}</main>

      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="store-glass px-3 py-2.5 flex items-center justify-around text-[11px] shadow-[0_18px_35px_rgba(75,86,140,0.22)]">
          {bottomNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 min-w-[54px] ${
                isActive(item.href) ? "text-[var(--store-accent)]" : "text-slate-500"
              }`}
            >
              <span className="text-[17px] relative leading-none">
                {item.icon}
                {item.href === "/cart" && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 rounded-full bg-[var(--store-accent)] text-white text-[9px] px-1">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="leading-none">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
