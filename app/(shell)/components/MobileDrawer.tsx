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
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute left-0 top-0 h-full w-72 bg-white/95 backdrop-blur border-r border-[var(--admin-border)] shadow-2xl p-4 flex flex-col gap-4 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-[0_10px_20px_rgba(79,70,229,0.24)]">
              BM
            </span>
            <div>
              <div>Boss Market</div>
              <div className="text-xs text-slate-500">Team 1 · Free</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 bg-white border border-[var(--admin-border)]" aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${
                pathname === item.href
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_12px_24px_rgba(79,70,229,0.24)]"
                  : "text-slate-700 hover:bg-indigo-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </span>
              {item.badge && (
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    pathname === item.href ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
