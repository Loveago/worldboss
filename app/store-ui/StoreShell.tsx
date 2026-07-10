"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/format";
import ThemeToggle from "../(shell)/components/ThemeToggle";

type NavIcon = "sparkles" | "bag" | "grid" | "signal" | "palette" | "home" | "cart" | "store" | "user" | "lock" | "search" | "bolt";

const navItems = [
  { label: "Explore", href: "/", icon: "sparkles" as NavIcon },
  { label: "Shop", href: "/shop", icon: "bag" as NavIcon },
  { label: "Categories", href: "/categories", icon: "grid" as NavIcon },
  { label: "Data", href: "/data", icon: "signal" as NavIcon },
  { label: "Request Design", href: "/request-design", icon: "palette" as NavIcon },
];

/** Signed-in user utility links shown in sidebar below main nav */
const userNavItems = [
  { label: "Profile", href: "/profile", icon: "user" as NavIcon },
  { label: "Orders", href: "/orders", icon: "bag" as NavIcon },
  { label: "Data Orders", href: "/data-orders", icon: "signal" as NavIcon },
];

const bottomNav = [
  { label: "Home", href: "/", icon: "home" as NavIcon },
  { label: "Shop", href: "/shop", icon: "bag" as NavIcon },
  { label: "Data", href: "/data", icon: "signal" as NavIcon },
  { label: "Cart", href: "/cart", icon: "cart" as NavIcon },
];

type AuthProfile = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  name?: string | null;
  phone?: string | null;
  createdAt?: string;
  agentStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
};

function NavIconGlyph({ name, className = "h-4 w-4" }: { name: NavIcon; className?: string }) {
  if (name === "sparkles") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "bag") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M7 9V7a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M5 9h14l-1 10a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "grid") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "signal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 17a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M7 17a5 5 0 0110 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M10 17a2 2 0 014 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "palette") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 4a8 8 0 100 16h1.2a2.8 2.8 0 100-5.6h-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="8" cy="10" r="1" fill="currentColor" />
        <circle cx="12" cy="8" r="1" fill="currentColor" />
        <circle cx="16" cy="10" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 10.5V19h10v-8.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "cart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="9" cy="19" r="1.5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17" cy="19" r="1.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3 5h2l2.4 9.3a1 1 0 001 .7h8.8a1 1 0 001-.8L21 8H7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "store") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 9l1.5-4h13L20 9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M5 9h14v10H5V9z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 19v-4h6v4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "user") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5 19a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "lock") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" />
        <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export default function StoreShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAgentStorefront = pathname.startsWith("/agents/storefront/");
  const queryClient = useQueryClient();
  const items = useCartStore((state) => state.items);
  const cartCount = items.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const isActive = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href));

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
  const showAgentNav = Boolean(user && user.agentStatus && user.agentStatus !== "REJECTED");

  const desktopNavItems = [
    ...navItems,
    ...(showAgentNav ? [{ label: "Agents", href: "/agent/dashboard", icon: "store" as NavIcon }] : []),
    ...(user ? userNavItems : []),
  ];

  const mobileNavItems = [...bottomNav];
  const mobileQuickItems = [
    ...navItems,
    ...(user ? userNavItems : []),
    ...(showAgentNav ? [{ label: "Agents", href: "/agent/dashboard", icon: "store" as NavIcon }] : []),
  ];

  const sidebarItems = [
    ...desktopNavItems,
    ...(user ? [] : [{ label: "Sign in", href: "/login", icon: "lock" as NavIcon }]),
  ];

  const showMobileMiniCart =
    cartCount > 0 &&
    !isAgentStorefront &&
    !pathname.startsWith("/cart") &&
    !pathname.startsWith("/checkout") &&
    !pathname.startsWith("/payments") &&
    !pathname.startsWith("/receipts");

  return (
    <div className="store-shell min-h-screen overflow-x-clip">
      {isAgentStorefront ? (
        <main className="w-full min-w-0">{children}</main>
      ) : (
        <div className="mx-auto w-full max-w-[1360px] min-w-0 px-3 py-3 md:px-4 md:py-4">
          <div className="grid gap-4 md:grid-cols-[250px_minmax(0,1fr)] lg:gap-5 min-w-0">
            <aside className="store-sidebar hidden md:flex h-[calc(100vh-2rem)] sticky top-4 flex-col p-4 lg:p-5">
              <Link href="/" className="font-sora text-xl font-semibold flex items-center gap-2.5 text-slate-900">
                <span className="store-brand-mark" aria-hidden>
                  <NavIconGlyph name="bolt" className="h-4 w-4" />
                </span>
                <span>
                  Korelly
                  <span className="block text-[11px] font-medium text-slate-500 tracking-wide">Command store</span>
                </span>
              </Link>

              <nav className="mt-7 flex-1 space-y-1.5 overflow-auto pr-1">
                {sidebarItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`store-nav-link ${isActive(item.href) ? "store-nav-active" : ""}`}
                  >
                    <span
                      className={`h-8 w-8 rounded-xl inline-flex items-center justify-center ${
                        isActive(item.href) ? "bg-white/20" : "bg-[var(--store-accent-soft)] text-[var(--store-accent)]"
                      }`}
                    >
                      <NavIconGlyph name={item.icon} className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="mt-4 space-y-2">
                {isAdmin && (
                  <Link href="/admin/dashboard" className="store-outline w-full px-3 py-2 text-xs font-medium text-center block">
                    Admin console
                  </Link>
                )}
                {user ? (
                  <button
                    type="button"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isLoading}
                    className="store-outline w-full px-3 py-2 text-xs font-medium"
                  >
                    {logoutMutation.isLoading ? "Signing out..." : "Sign out"}
                  </button>
                ) : (
                  <Link href="/register" className="store-btn-primary block w-full px-3 py-2.5 text-center text-xs">
                    Create account
                  </Link>
                )}
              </div>
            </aside>

            <div className="min-w-0 space-y-4">
              <section className="md:hidden space-y-3">
                <div className="store-card px-3.5 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="h-10 w-10 rounded-xl border border-[var(--store-border)] bg-white inline-flex items-center justify-center text-slate-700"
                        aria-label="Open menu"
                      >
                        <span className="inline-flex flex-col gap-1" aria-hidden>
                          <span className="h-0.5 w-4 rounded-full bg-current" />
                          <span className="h-0.5 w-4 rounded-full bg-current" />
                          <span className="h-0.5 w-4 rounded-full bg-current" />
                        </span>
                      </button>
                      <Link href="/" className="font-sora text-[1.55rem] font-semibold flex items-center gap-2 text-slate-900 leading-none">
                        <span className="store-brand-mark" aria-hidden>
                          <NavIconGlyph name="bolt" className="h-4 w-4" />
                        </span>
                        <span>Korelly</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      <ThemeToggle className="store-outline px-3.5 py-2.5 text-xs font-medium" />
                      <Link href="/cart" className="relative h-10 w-10 rounded-xl border border-[var(--store-border)] bg-white inline-flex items-center justify-center text-slate-600">
                        <NavIconGlyph name="cart" className="h-4 w-4" />
                        {cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 rounded-full bg-[var(--store-accent)] text-white text-[10px] min-w-[17px] h-[17px] px-1 inline-flex items-center justify-center">
                            {cartCount}
                          </span>
                        )}
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="store-outline flex-1 flex items-center gap-2 px-3 py-2.5 bg-white/95 rounded-2xl">
                      <span className="text-slate-500">
                        <NavIconGlyph name="search" className="h-4 w-4" />
                      </span>
                      <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Search gadgets, templates, data..." />
                    </label>
                    <Link
                      href="/data"
                      className="h-11 w-11 rounded-2xl store-btn-primary inline-flex items-center justify-center"
                      aria-label="Buy data"
                    >
                      <NavIconGlyph name="signal" className="h-4 w-4" />
                    </Link>
                  </div>

                  {user ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/profile" className="store-outline px-4 py-2.5 text-sm text-center font-medium bg-white/90">
                        Hi, {user.name || user.email.split("@")[0]}
                      </Link>
                      <button
                        type="button"
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isLoading}
                        className="store-btn-primary px-4 py-2.5 text-sm"
                      >
                        {logoutMutation.isLoading ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/login" className="store-outline px-4 py-2.5 text-sm text-center font-medium bg-white/90">
                        Sign in
                      </Link>
                      <Link href="/register" className="store-btn-primary px-4 py-2.5 text-sm text-center">
                        Register
                      </Link>
                    </div>
                  )}
                </div>

                <div className="store-card px-2.5 py-2.5 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-2 min-w-max">
                    {mobileQuickItems.map((item) => (
                      <Link
                        key={`mobile-nav-${item.href}`}
                        href={item.href}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs border transition whitespace-nowrap ${
                          isActive(item.href)
                            ? "border-transparent store-nav-active"
                            : "border-[var(--store-border)] text-slate-600 bg-white"
                        }`}
                      >
                        <NavIconGlyph name={item.icon} className="h-3.5 w-3.5" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>

              <header className="store-card px-4 py-3 md:px-5 md:py-4 hidden md:block">
                <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
                  <label className="store-outline flex-1 min-w-[220px] flex items-center gap-2 px-3 py-2.5 bg-white/90">
                    <span className="text-slate-500">
                      <NavIconGlyph name="search" className="h-4 w-4" />
                    </span>
                    <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Search gadgets, templates, data bundles..." />
                    <span className="store-outline px-1.5 py-0.5 text-[10px] text-slate-500 hidden sm:inline">⌘ K</span>
                  </label>

                  <ThemeToggle className="store-outline px-3 py-2 text-xs font-medium" />

                  {isAdmin && (
                    <Link href="/admin/dashboard" className="store-outline px-3 py-2 text-xs font-medium">
                      Admin
                    </Link>
                  )}

                  <Link href="/cart" className="store-outline px-3 py-2 text-xs font-medium inline-flex items-center gap-2">
                    <span className="text-slate-600">
                      <NavIconGlyph name="cart" className="h-4 w-4" />
                    </span>
                    <span>Cart</span>
                    {cartCount > 0 && <span className="store-pill px-2 py-0.5 text-[10px]">{cartCount}</span>}
                  </Link>

                  {user ? (
                    <Link href="/profile" className="store-outline px-3 py-2 text-xs font-medium">
                      Hi, {user.name || user.email.split("@")[0]}
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" className="store-outline px-3 py-2 text-xs font-medium">
                        Sign in
                      </Link>
                      <Link href="/register" className="store-btn-primary px-3.5 py-2 text-xs">
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </header>

              <main className="pb-28 md:pb-6">{children}</main>

              <footer className="store-card px-4 py-4 mb-20 md:mb-0 text-xs sm:text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium text-slate-800">Korelly</span>
                  <a href="tel:0547419727" className="hover:text-[var(--store-accent)] transition">
                    0547419727
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href="mailto:officialkorelly@gmail.com" className="hover:text-[var(--store-accent)] transition">
                    officialkorelly@gmail.com
                  </a>
                  <a
                    href="https://chat.whatsapp.com/GbPWhbaiybQLFgDwcx2182?s=cl&p=a&mlu=1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--store-accent)] transition"
                  >
                    WhatsApp
                  </a>
                </div>
              </footer>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50">
              <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu" />
              <div className="store-drawer absolute left-0 top-0 h-full w-[86%] max-w-[320px] p-4 flex flex-col gap-4 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="font-sora text-lg font-semibold flex items-center gap-2 text-slate-900">
                    <span className="store-brand-mark" aria-hidden>
                      <NavIconGlyph name="bolt" className="h-4 w-4" />
                    </span>
                    <span>Korelly</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="h-9 w-9 rounded-xl border border-[var(--store-border)] inline-flex items-center justify-center text-slate-600"
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {sidebarItems.map((item) => (
                    <Link
                      key={`drawer-${item.href}`}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`store-nav-link ${isActive(item.href) ? "store-nav-active" : "border border-[var(--store-border)] bg-white/70"}`}
                    >
                      <span
                        className={`h-8 w-8 rounded-xl inline-flex items-center justify-center ${
                          isActive(item.href) ? "bg-white/20" : "bg-[var(--store-accent-soft)] text-[var(--store-accent)]"
                        }`}
                      >
                        <NavIconGlyph name={item.icon} className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  ))}
                </nav>

                {!user && (
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="store-btn-primary px-3 py-2.5 text-center text-sm"
                  >
                    Create account
                  </Link>
                )}
              </div>
            </div>
          )}

          {showMobileMiniCart && (
            <div className="md:hidden fixed bottom-[86px] left-3 right-3 z-40">
              <div className="store-glass px-3 py-2.5 border border-white/65 shadow-[0_18px_34px_rgba(52,64,126,0.2)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Cart ready</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {cartCount} item{cartCount > 1 ? "s" : ""} · {formatCurrency(cartSubtotal)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/cart" className="store-outline px-3 py-1.5 text-xs bg-white/80 active:scale-95 transition-transform">
                      View cart
                    </Link>
                    <Link href="/checkout" className="store-btn-primary px-3 py-1.5 text-xs active:scale-95 transition-transform">
                      Checkout
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
            <div className="store-bottom-nav px-2 py-2 grid grid-cols-4 gap-1">
              {mobileNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center gap-1 min-w-0 rounded-xl px-1 py-1.5 transition-all duration-300 active:scale-95 ${
                    isActive(item.href) ? "text-[var(--store-accent)]" : "text-slate-500"
                  }`}
                >
                  <span
                    className={`relative leading-none rounded-lg p-1.5 transition-colors duration-300 ${
                      isActive(item.href) ? "bg-[var(--store-accent-soft)]" : "bg-slate-100/70"
                    }`}
                  >
                    <NavIconGlyph name={item.icon} className="h-[17px] w-[17px]" />
                    {item.href === "/cart" && cartCount > 0 && (
                      <span className="absolute -top-1 -right-2 rounded-full bg-[var(--store-accent)] text-white text-[9px] min-w-[15px] h-[15px] px-1 inline-flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </span>
                  <span className={`leading-none truncate max-w-full text-[11px] ${isActive(item.href) ? "font-semibold" : ""}`}>
                    {item.label}
                  </span>
                  {isActive(item.href) && <span className="h-0.5 w-6 rounded-full bg-[var(--store-accent)]" />}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
