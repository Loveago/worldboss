"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "../layout";

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
};

export default function MobileDrawer({ open, onClose, navItems }: MobileDrawerProps) {
  const pathname = usePathname();

  return (
    <div className={`md:hidden fixed inset-0 z-30 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/35 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`admin-drawer absolute left-0 top-0 h-full w-72 p-4 flex flex-col gap-4 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="admin-brand-mark">KL</span>
            <div>
              <div className="font-sora font-semibold text-slate-900">Korelly</div>
              <div className="text-xs text-slate-500">Ops console</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 bg-white border border-[var(--admin-border)]" aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`admin-nav-link flex items-center justify-between text-sm ${
                  active ? "admin-nav-active" : "text-slate-700 border border-[var(--admin-border)] bg-white/70"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`h-8 w-8 rounded-xl inline-flex items-center justify-center ${
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
          })}
        </nav>

        <Link href="/" onClick={onClose} className="mt-auto admin-btn justify-center">
          Back to store
        </Link>
      </div>
    </div>
  );
}
