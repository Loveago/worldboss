"use client";

import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MobileDrawer from "./components/MobileDrawer";
import RightPanel from "./components/RightPanel";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { label: "Products", href: "/admin/products", icon: "🛍️" },
  { label: "Orders", href: "/admin/orders", icon: "🧾", badge: "+3" },
  { label: "Data Orders", href: "/admin/data", icon: "📶" },
  { label: "Categories", href: "/admin/categories", icon: "🗂️" },
  { label: "Users", href: "/admin/users", icon: "👥" },
  { label: "Payments", href: "/admin/payments", icon: "💳" },
  { label: "Settings", href: "/admin/settings", icon: "⚙️" },
];

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="admin-shell min-h-screen bg-[var(--bg)] text-slate-900 flex">
      <Sidebar navItems={navItems} />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
      />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header onMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>

      <RightPanel />
    </div>
  );
}
