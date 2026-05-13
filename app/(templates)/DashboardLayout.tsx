import React from "react";

export default function DashboardLayout({
  hero,
  stats,
  children,
}: {
  hero: React.ReactNode;
  stats: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="card p-4 md:p-6 bg-white">
        {hero}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">{children}</div>
    </div>
  );
}
