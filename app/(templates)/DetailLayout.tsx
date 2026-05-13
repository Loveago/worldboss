import React from "react";

export default function DetailLayout({
  media,
  details,
  sidebar,
}: {
  media: React.ReactNode;
  details: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <div className="lg:col-span-2 card p-4 md:p-6 bg-white">{media}</div>
      <div className="space-y-4">
        <div className="card p-4 md:p-6 bg-white">{details}</div>
        {sidebar}
      </div>
    </div>
  );
}
