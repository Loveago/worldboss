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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {toolbar}
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="table-stacked p-3 sm:p-4 lg:p-0 lg:hidden">{mobile}</div>
        <div className="hidden lg:block overflow-x-auto">{table}</div>
      </div>
    </div>
  );
}
