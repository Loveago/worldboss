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
      <span className="flex items-center gap-2.5">
        <span
          className={`h-8 w-8 rounded-xl inline-flex items-center justify-center text-base ${
            active ? "bg-white/20" : "bg-[var(--admin-accent-soft)]"
          }`}
        >
          {item.icon}
        </span>
        <span className="font-medium">{item.label}</span>
      </span>
      {item.badge && (
        <span
          className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${
            active ? "bg-white/20 text-white" : "bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"
          }`}
        >
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
      <div className="px-1">
        <div className="flex items-center gap-3">
          <span className="admin-brand-mark">KL</span>
          <div>
            <div className="font-sora text-lg font-semibold text-slate-900">Korelly</div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              Ops console
              <span className="admin-pill px-2 py-0.5 text-[10px]">Live</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
        ))}
      </nav>

      <div className="mt-auto admin-hero p-4">
        <div className="relative z-10 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/60">Command center</div>
          <div className="text-sm font-semibold text-white">Need deeper automation?</div>
          <p className="text-xs text-white/70 leading-relaxed">
            Unlock analytics, agent controls, and bulk ops for Korelly.
          </p>
          <button className="mt-1 w-full rounded-full bg-white/95 text-indigo-700 px-3 py-2 text-xs font-semibold">
            Explore plans
          </button>
        </div>
      </div>
    </aside>
  );
}
