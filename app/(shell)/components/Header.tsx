"use client";

import React from "react";
import ThemeToggle from "./ThemeToggle";

type HeaderProps = {
  onMenu: () => void;
};

export default function Header({ onMenu }: HeaderProps) {
  return (
    <header className="admin-header sticky top-0 z-20 backdrop-blur">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="md:hidden rounded-full p-2 bg-white text-slate-700 border border-[var(--admin-border)]"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">Korelly Admin</span>
            <span>•</span>
            <span>Team 1</span>
            <span className="admin-pill px-2 py-0.5 text-[10px]">Free</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white/90 rounded-full px-3 py-2 text-sm text-slate-600 border border-[var(--admin-border)] shadow-[0_8px_20px_rgba(79,70,229,0.08)]">
            <span role="img" aria-label="search">
              🔍
            </span>
            <input
              className="bg-transparent focus:outline-none placeholder:text-slate-400 min-w-[140px]"
              placeholder="Search"
            />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="admin-btn-outline text-xs" />
            <button className="admin-btn-outline text-xs">
              🇬🇧 EN
            </button>
            <button className="admin-btn-outline px-3" aria-label="notifications">
              🔔
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center font-semibold shadow-[0_10px_20px_rgba(79,70,229,0.28)]">
              KL
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
