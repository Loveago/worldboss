"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCartStore } from "@/store/cart";
import ThemeToggle from "../(shell)/components/ThemeToggle";

const navItems = [
  { label: "Explore", href: "/", icon: "✨" },
  { label: "Shop", href: "/shop", icon: "🛍️" },
  { label: "Categories", href: "/categories", icon: "🧭" },
  { label: "Data", href: "/data", icon: "📶" },
  { label: "Request Design", href: "/request-design", icon: "🎨" },
];

const bottomNav = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Shop", href: "/shop", icon: "🛍️" },
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
  agentStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
};

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
    ...(showAgentNav ? [{ label: "Agents", href: "/agent/dashboard", icon: "🏪" }] : []),
    ...(user ? [{ label: "Profile", href: "/profile", icon: "👤" }] : []),
  ];

  const mobileNavItems = [
    ...bottomNav,
    ...(showAgentNav ? [{ label: "Agents", href: "/agent/dashboard", icon: "🏪" }] : []),
    ...(user ? [{ label: "Profile", href: "/profile", icon: "👤" }] : []),
  ];

  const sidebarItems = [
    ...desktopNavItems,
    ...(user ? [] : [{ label: "Sign in", href: "/login", icon: "🔐" }]),
  ];

  return (
    <div className="store-shell min-h-screen">
      {isAgentStorefront ? (
        <main className="w-full">{children}</main>
      ) : (
        <div className="mx-auto w-full max-w-[1360px] px-3 py-3 md:px-4 md:py-4">
          <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)] lg:gap-5">
            <aside className="store-card hidden md:flex h-[calc(100vh-2rem)] sticky top-4 flex-col p-4 lg:p-5">
              <Link href="/" className="font-sora text-xl font-semibold flex items-center gap-2 text-slate-900">
                <span aria-hidden>⚡</span>
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
                    <span>{item.icon}</span>
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
                    <span className="text-sm">🔎</span>
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
                    <span>🧺 Cart</span>
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

              <main className="pb-28 md:pb-6">{children}</main>

              <footer className="store-card px-4 py-4 text-xs sm:text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>Corelly · Contact: +233 24 000 0000</div>
                <div>Email: support@corelly.app · WhatsApp: +233 24 000 0000</div>
              </footer>
            </div>
          </div>

          <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
            <div className="store-glass px-3 py-2.5 flex items-center justify-around text-[11px] shadow-[0_18px_35px_rgba(75,86,140,0.22)]">
              {mobileNavItems.map((item) => (
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
      )}
    </div>
  );
}
