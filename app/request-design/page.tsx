"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

type DesignRequestPayload = {
  name: string;
  contact: string;
  channel: "whatsapp" | "telegram";
  message?: string;
};

export default function RequestDesignPage() {
  const [form, setForm] = useState<DesignRequestPayload>({
    name: "",
    contact: "",
    channel: "whatsapp",
    message: "",
  });

  const mutation = useMutation({
    mutationFn: (payload: DesignRequestPayload) =>
      apiFetch("/api/design-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () =>
      setForm({
        name: "",
        contact: "",
        channel: "whatsapp",
        message: "",
      }),
  });

  const updateField = (field: keyof DesignRequestPayload, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const errorMessage = mutation.isError
    ? mutation.error instanceof Error
      ? mutation.error.message
      : "Unable to submit request."
    : null;

  return (
    <div className="space-y-6">
      <section className="store-glass p-5 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,165,233,0.04)_45%,transparent_70%)]" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Request a design</div>
            <h1 className="font-sora text-2xl text-slate-900 mt-2">Need a bespoke look for your brand?</h1>
            <p className="text-sm text-slate-600 mt-2 max-w-xl">
              Share your vision and assets. Our design concierge will respond within 1 business day with next steps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="store-pill px-3 py-1 text-xs">No checkout needed</span>
            <span className="store-chip px-3 py-1 text-xs">Custom quotes</span>
          </div>
        </div>
      </section>

      <section className="store-card p-0 overflow-hidden">
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Response time</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">1 business day</div>
            <div className="text-xs text-slate-500">Average first reply</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Channels</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">2</div>
            <div className="text-xs text-slate-500">WhatsApp & Telegram</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Service mode</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">Concierge</div>
            <div className="text-xs text-slate-500">Tailored design support</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="store-card p-6 space-y-5">
          <div className="text-sm font-semibold text-slate-900">Tell us about your project</div>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate({
                name: form.name.trim(),
                contact: form.contact.trim(),
                channel: form.channel,
                message: form.message?.trim() || undefined,
              });
            }}
          >
            <label className="block text-sm text-slate-600 space-y-2">
              <span>Name</span>
              <input
                className="w-full store-outline bg-white px-4 py-3 text-sm outline-none"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Ama Mensah"
                required
              />
            </label>
            <label className="block text-sm text-slate-600 space-y-2">
              <span>Phone or email</span>
              <input
                className="w-full store-outline bg-white px-4 py-3 text-sm outline-none"
                value={form.contact}
                onChange={(event) => updateField("contact", event.target.value)}
                placeholder="+233 54 000 0000"
                required
              />
            </label>
            <label className="block text-sm text-slate-600 space-y-2">
              <span>Preferred channel</span>
              <div className="flex flex-wrap gap-2">
                {["whatsapp", "telegram"].map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => updateField("channel", channel)}
                    className={`px-4 py-2 text-xs rounded-full border transition ${
                      form.channel === channel
                        ? "bg-[var(--store-accent)] text-white border-transparent"
                        : "border-[var(--store-border)] text-slate-600 bg-white"
                    }`}
                  >
                    {channel === "whatsapp" ? "WhatsApp" : "Telegram"}
                  </button>
                ))}
              </div>
            </label>
            <label className="block text-sm text-slate-600 space-y-2">
              <span>Project notes (optional)</span>
              <textarea
                className="w-full min-h-[140px] rounded-2xl border border-[var(--store-border)] bg-white px-4 py-3 text-sm outline-none"
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Logo refresh, social media templates, or packaging mockups..."
              />
            </label>

            {errorMessage && <div className="text-sm text-rose-600">{errorMessage}</div>}
            {mutation.isSuccess && <div className="text-sm text-emerald-600">Request sent successfully.</div>}

            <button
              type="submit"
              className="w-full rounded-full bg-[var(--store-accent)] text-white px-4 py-3 text-sm font-semibold"
              disabled={mutation.isLoading}
            >
              {mutation.isLoading ? "Sending..." : "Send request"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="store-card p-5 space-y-3">
            <div className="text-sm font-semibold text-slate-900">Quick contact</div>
            <p className="text-sm text-slate-600">
              Prefer to chat? Reach us instantly on your favorite messaging app.
            </p>
            <div className="grid gap-3">
              <a
                className="rounded-full bg-emerald-500 text-white text-center py-3 text-sm font-semibold"
                href="https://wa.me/1234567890"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp concierge
              </a>
              <a
                className="rounded-full bg-blue-500 text-white text-center py-3 text-sm font-semibold"
                href="https://t.me/bossmarket"
                target="_blank"
                rel="noreferrer"
              >
                Telegram concierge
              </a>
            </div>
          </div>

          <div className="store-card p-5 space-y-3 text-sm text-slate-600">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">What we can help with</div>
            <ul className="space-y-2">
              <li>• Brand identity refresh &amp; logo systems</li>
              <li>• Event flyers, social media kits, and templates</li>
              <li>• Packaging mockups, product sheets, and brochures</li>
              <li>• UI visuals for product launches</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
