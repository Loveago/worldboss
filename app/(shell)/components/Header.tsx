"use client";

import React from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

type HeaderProps = {
  onMenu: () => void;
};

export default function Header({ onMenu }: HeaderProps) {
  return (
    <header className="admin-header sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 md:px-6 py-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="md:hidden rounded-xl p-2.5 bg-white text-slate-700 border border-[var(--admin-border)]"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <span className="font-sora font-semibold text-slate-900">Korelly Admin</span>
            <span className="text-slate-300">•</span>
            <span>Mission control</span>
            <span className="admin-pill px-2 py-0.5 text-[10px]">Cosmos</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 bg-white/90 rounded-full px-3 py-2 text-sm text-slate-600 border border-[var(--admin-border)] shadow-[0_8px_20px_rgba(79,70,229,0.08)]">
            <span role="img" aria-label="search">
              🔍
            </span>
            <input
              className="bg-transparent focus:outline-none placeholder:text-slate-400 min-w-[150px]"
              placeholder="Search orders, users..."
            />
          </div>

          <ThemeToggle className="admin-btn-outline text-xs" />
          <Link href="/" className="admin-btn-outline text-xs hidden sm:inline-flex">
            Store
          </Link>
          <button className="admin-btn-outline px-3" aria-label="notifications">
            🔔
          </button>
          <div className="admin-brand-mark !w-10 !h-10 text-sm">KL</div>
        </div>
      </div>
    </header>
  );
}
