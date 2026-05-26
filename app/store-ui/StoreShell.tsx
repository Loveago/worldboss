"use client";

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
    ...(user ? [{ label: "Profile", href: "/profile", icon: "user" as NavIcon }] : []),
  ];

  const mobileNavItems = [
    ...bottomNav,
    ...(showAgentNav ? [{ label: "Agents", href: "/agent/dashboard", icon: "store" as NavIcon }] : []),
    ...(user ? [{ label: "Profile", href: "/profile", icon: "user" as NavIcon }] : []),
  ];

  const sidebarItems = [
    ...desktopNavItems,
    ...(user ? [] : [{ label: "Sign in", href: "/login", icon: "lock" as NavIcon }]),
  ];

  const activeMobileIndex = Math.max(
    0,
    mobileNavItems.findIndex((item) => isActive(item.href))
  );
  const showMobileMiniCart =
    cartCount > 0 &&
    !isAgentStorefront &&
    !pathname.startsWith("/cart") &&
    !pathname.startsWith("/checkout") &&
    !pathname.startsWith("/payments") &&
    !pathname.startsWith("/receipts");

  return (
    <div className="store-shell min-h-screen">
      {isAgentStorefront ? (
        <main className="w-full">{children}</main>
      ) : (
        <div className="mx-auto w-full max-w-[1360px] px-3 py-3 md:px-4 md:py-4">
          <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)] lg:gap-5">
            <aside className="store-card hidden md:flex h-[calc(100vh-2rem)] sticky top-4 flex-col p-4 lg:p-5">
              <Link href="/" className="font-sora text-xl font-semibold flex items-center gap-2 text-slate-900">
                <span className="h-8 w-8 rounded-xl bg-[var(--store-accent-soft)] text-[var(--store-accent)] flex items-center justify-center" aria-hidden>
                  <NavIconGlyph name="bolt" className="h-4.5 w-4.5" />
                </span>
                <span>Corelly</span>
              </Link>

              <nav className="mt-6 flex-1 space-y-1.5 overflow-auto pr-1">
                {sidebarItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive(item.href)
                        ? "bg-[var(--store-accent-soft)] text-[var(--store-accent)] font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className={`h-7 w-7 rounded-lg inline-flex items-center justify-center ${isActive(item.href) ? "bg-white/80" : "bg-slate-100/80"}`}>
                      <NavIconGlyph name={item.icon} className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              {user ? (
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isLoading}
                  className="store-outline mt-4 px-3 py-2 text-xs font-medium"
                >
                  {logoutMutation.isLoading ? "Signing out..." : "Sign out"}
                </button>
              ) : (
                <Link
                  href="/register"
                  className="mt-4 rounded-xl bg-[var(--store-accent)] px-3 py-2 text-center text-xs font-semibold text-white"
                >
                  Create account
                </Link>
              )}
            </aside>

            <div className="min-w-0 space-y-4">
              <header className="store-card px-4 py-3 md:px-5 md:py-4">
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
                      <Link href="/register" className="rounded-xl bg-[var(--store-accent)] px-3 py-2 text-xs font-semibold text-white">
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </header>

              <section className="md:hidden -mt-2">
                <div className="store-card px-3 py-2.5 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-2 min-w-max">
                    {desktopNavItems.map((item) => (
                      <Link
                        key={`quick-${item.href}`}
                        href={item.href}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${
                          isActive(item.href)
                            ? "border-[var(--store-accent)] bg-[var(--store-accent-soft)] text-[var(--store-accent)]"
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

              <main className="pb-28 md:pb-6">{children}</main>

              <footer className="store-card px-4 py-4 text-xs sm:text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>Corelly · Contact: +233 24 000 0000</div>
                <div>Email: support@corelly.app · WhatsApp: +233 24 000 0000</div>
              </footer>
            </div>
          </div>

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
                    <Link
                      href="/checkout"
                      className="rounded-full bg-[var(--store-accent)] text-white px-3 py-1.5 text-xs active:scale-95 transition-transform"
                    >
                      Checkout
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
            <div className="relative overflow-hidden store-glass px-2 py-2 flex items-center gap-1 text-[11px] shadow-[0_22px_38px_rgba(52,64,126,0.24)] border border-white/60 backdrop-blur-2xl">
              <span
                className="absolute top-2 bottom-2 rounded-xl bg-white/85 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: `${100 / mobileNavItems.length}%`,
                  transform: `translateX(${activeMobileIndex * 100}%)`,
                }}
              />
              {mobileNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative z-10 flex-1 flex flex-col items-center gap-1 min-w-0 rounded-xl px-1 py-1.5 transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] active:scale-95 ${
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
                  <span className={`leading-none truncate max-w-full ${isActive(item.href) ? "font-semibold" : ""}`}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
