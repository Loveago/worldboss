import React from "react";

export default function GridLayout({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 md:space-y-5">
      <section className="admin-hero p-5 md:p-6">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Catalog</div>
            <h1 className="font-sora text-xl md:text-2xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-white/70">Create, edit, and organize inventory in one command surface.</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}
