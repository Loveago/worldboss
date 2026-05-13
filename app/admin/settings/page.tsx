import React from "react";

export default function AdminSettingsPage() {
  return (
    <div className="card p-5 bg-white space-y-3">
      <div className="text-sm text-slate-500">Settings</div>
      <h1 className="text-xl font-semibold text-slate-900">Store preferences</h1>
      <div className="space-y-2 text-sm text-slate-700">
        <div>Theme: Light</div>
        <div>Locale: en-GB</div>
        <div>Notifications: Enabled</div>
      </div>
      <button className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm">Save</button>
    </div>
  );
}
