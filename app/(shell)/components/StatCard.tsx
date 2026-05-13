import React from "react";

export type StatTone = "blue" | "purple" | "amber" | "rose";

const toneClass: Record<StatTone, string> = {
  blue: "gradient-blue",
  purple: "gradient-purple",
  amber: "gradient-amber",
  rose: "gradient-rose",
};

const iconBg: Record<StatTone, string> = {
  blue: "bg-blue-500/80",
  purple: "bg-purple-500/80",
  amber: "bg-amber-400/90",
  rose: "bg-rose-400/90",
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
    <div className={`card p-4 md:p-5 relative overflow-hidden ${toneClass[tone]}`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow ${iconBg[tone]}`}>
          <span className="text-xl">{icon}</span>
        </div>
        <span className="text-xs font-semibold text-slate-700 bg-white/60 px-2 py-1 rounded-full">
          {trend}
        </span>
      </div>
      <div className="mt-4 text-sm text-slate-600">{label}</div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-4 h-10 w-full text-[10px] text-slate-400">sparkline</div>
    </div>
  );
}
