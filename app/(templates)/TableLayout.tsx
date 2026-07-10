import React from "react";

export default function TableLayout({
  title,
  toolbar,
  table,
  mobile,
}: {
  title: string;
  toolbar?: React.ReactNode;
  table: React.ReactNode;
  mobile: React.ReactNode;
}) {
  return (
    <div className="space-y-4 md:space-y-5">
      <section className="admin-hero p-5 md:p-6">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Operations</div>
            <h1 className="font-sora text-xl md:text-2xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-white/70">Manage records, filters, and live status updates.</p>
          </div>
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      </section>
      <div className="card p-0 overflow-hidden border border-[var(--admin-border)]">
        <div className="table-stacked p-3 sm:p-4 lg:p-0 lg:hidden">{mobile}</div>
        <div className="hidden lg:block overflow-x-auto">{table}</div>
      </div>
    </div>
  );
}
