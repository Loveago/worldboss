"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "../layout";

type SidebarProps = {
  navItems: NavItem[];
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`admin-nav-link flex items-center justify-between text-sm ${
        active ? "admin-nav-active" : "text-slate-600"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="text-lg">{item.icon}</span>
        <span className="font-medium">{item.label}</span>
      </span>
      {item.badge && (
        <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({ navItems }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar hidden md:flex w-64 flex-col py-6 px-4 gap-6">
      <div className="px-2">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-[0_10px_20px_rgba(79,70,229,0.24)]">
            KL
          </span>
          <div>
            <div>Korelly</div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              Team 1
              <span className="admin-pill px-2 py-0.5 text-[10px]">Free</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href} />
        ))}
      </nav>

      <div className="mt-auto card p-4 text-sm text-slate-600 gradient-blue border border-[var(--admin-border)]">
        <div className="font-semibold text-slate-900">More features?</div>
        <p className="mt-1 text-xs text-slate-600">Upgrade to unlock automation and advanced analytics.</p>
        <button className="mt-3 w-full admin-btn">Upgrade</button>
      </div>
    </aside>
  );
}
