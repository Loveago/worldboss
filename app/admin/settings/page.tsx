"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

type DataProvider = "encart" | "grandtech";

type AdminSettings = {
  dataProvider: DataProvider;
  grandtechApiKeySet: boolean;
  grandtechApiKeyPreview: string;
  grandtechBaseUrl: string;
  grandtechWebhookUrl: string;
};

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [dataProvider, setDataProvider] = useState<DataProvider>("encart");
  const [grandtechApiKey, setGrandtechApiKey] = useState("");
  const [grandtechBaseUrl, setGrandtechBaseUrl] = useState("https://backend.grandtechub.cloud");
  const [grandtechWebhookUrl, setGrandtechWebhookUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery<AdminSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => apiFetch<AdminSettings>("/api/admin/settings"),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setDataProvider(settingsQuery.data.dataProvider);
    setGrandtechBaseUrl(settingsQuery.data.grandtechBaseUrl || "https://backend.grandtechub.cloud");
    setGrandtechWebhookUrl(settingsQuery.data.grandtechWebhookUrl || "");
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: {
      dataProvider: DataProvider;
      grandtechApiKey?: string;
      grandtechBaseUrl?: string;
      grandtechWebhookUrl?: string;
    }) =>
      apiFetch<AdminSettings & { message?: string }>("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setMessage(data.message || "Settings saved");
      setError(null);
      setGrandtechApiKey("");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to save settings");
      setMessage(null);
    },
  });

  const onSave = () => {
    setMessage(null);
    setError(null);
    const payload: {
      dataProvider: DataProvider;
      grandtechApiKey?: string;
      grandtechBaseUrl?: string;
      grandtechWebhookUrl?: string;
    } = {
      dataProvider,
      grandtechBaseUrl: grandtechBaseUrl.trim(),
      grandtechWebhookUrl: grandtechWebhookUrl.trim(),
    };

    // Only send API key when admin typed a new value.
    if (grandtechApiKey.trim()) {
      payload.grandtechApiKey = grandtechApiKey.trim();
    }

    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white space-y-3">
        <div className="text-sm text-slate-500">Settings</div>
        <h1 className="text-xl font-semibold text-slate-900">Data provider preferences</h1>
        <p className="text-sm text-slate-600">
          Choose which provider fulfills data orders. When you switch providers, new paid orders are
          routed through the selected provider.
        </p>
      </div>

      <div className="card p-5 bg-white space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Active data provider</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDataProvider("encart")}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                dataProvider === "encart"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="font-semibold">Encart</div>
              <div className={`text-xs mt-1 ${dataProvider === "encart" ? "text-slate-200" : "text-slate-500"}`}>
                Existing Encart fulfillment pipeline
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDataProvider("grandtech")}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                dataProvider === "grandtech"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="font-semibold">GrandTech</div>
              <div className={`text-xs mt-1 ${dataProvider === "grandtech" ? "text-slate-200" : "text-slate-500"}`}>
                GrandTech Hub API (`backend.grandtechub.cloud`)
              </div>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">GrandTech configuration</h2>
            <p className="text-xs text-slate-500 mt-1">
              Required when GrandTech is selected. API key is stored in the database and can also be
              provided via `GRANDTECH_API_KEY`.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">GrandTech API key</label>
            <input
              type="password"
              value={grandtechApiKey}
              onChange={(e) => setGrandtechApiKey(e.target.value)}
              placeholder={
                settingsQuery.data?.grandtechApiKeySet
                  ? `Saved key: ${settingsQuery.data.grandtechApiKeyPreview}`
                  : "Paste GrandTech API key"
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <div className="text-xs text-slate-500">
              Leave blank to keep the current key. Enter a new value to replace it.
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">GrandTech base URL</label>
            <input
              type="url"
              value={grandtechBaseUrl}
              onChange={(e) => setGrandtechBaseUrl(e.target.value)}
              placeholder="https://backend.grandtechub.cloud"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">GrandTech callback / webhook URL</label>
            <input
              type="url"
              value={grandtechWebhookUrl}
              onChange={(e) => setGrandtechWebhookUrl(e.target.value)}
              placeholder="https://your-domain.com/api/webhooks/grandtech"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <div className="text-xs text-slate-500">
              Sent as `callback` on order creation. Defaults to `/api/webhooks/grandtech` on this app.
            </div>
          </div>
        </div>

        {(message || error) && (
          <div
            className={`rounded-xl px-3 py-2 text-sm ${
              error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saveMutation.isLoading || settingsQuery.isLoading}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-60"
          >
            {saveMutation.isLoading ? "Saving..." : "Save settings"}
          </button>
          {settingsQuery.isLoading && <span className="text-xs text-slate-500">Loading current settings…</span>}
        </div>
      </div>
    </div>
  );
}
