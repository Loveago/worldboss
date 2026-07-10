import React from "react";

export type StatTone = "blue" | "purple" | "amber" | "rose";

const iconBg: Record<StatTone, string> = {
  blue: "bg-indigo-500",
  purple: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

type StatCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: string;
  tone?: StatTone;
};

export default function StatCard({ label, value, trend, icon, tone = "blue" }: StatCardProps) {
  return (
    <div className="admin-stat-card p-4 md:p-5" data-tone={tone}>
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-lg ${iconBg[tone]}`}>
          <span className="text-xl">{icon}</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-600 bg-white/80 border border-[var(--admin-border)] px-2.5 py-1 rounded-full">
          {trend}
        </span>
      </div>
      <div className="relative z-10 mt-4 text-sm text-slate-600">{label}</div>
      <div className="relative z-10 text-2xl font-semibold text-slate-900 font-sora">{value}</div>
      <div className="relative z-10 mt-4 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            tone === "blue"
              ? "bg-indigo-500"
              : tone === "purple"
                ? "bg-violet-500"
                : tone === "amber"
                  ? "bg-amber-500"
                  : "bg-rose-500"
          }`}
          style={{ width: tone === "amber" ? "42%" : tone === "rose" ? "68%" : tone === "purple" ? "74%" : "86%" }}
        />
      </div>
    </div>
  );
}
