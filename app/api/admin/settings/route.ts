import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import {
  getAdminDataProviderSettings,
  SETTING_KEYS,
  setSetting,
  type DataProvider,
} from "@/lib/settings";
import { fail, ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user || user.role !== "ADMIN") return unauthorized();

  const settings = await getAdminDataProviderSettings(prisma);
  return ok({
    dataProvider: settings.dataProvider,
    grandtechApiKeySet: settings.grandtechApiKeySet,
    // Never return the full key; only a masked preview when present.
    grandtechApiKeyPreview: settings.grandtechApiKey
      ? `${settings.grandtechApiKey.slice(0, 4)}••••${settings.grandtechApiKey.slice(-4)}`
      : "",
    grandtechBaseUrl: settings.grandtechBaseUrl,
    grandtechWebhookUrl: settings.grandtechWebhookUrl,
  });
}

export async function PATCH(req: NextRequest) {
  const { user } = await getUserFromRequest(req);
  if (!user || user.role !== "ADMIN") return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid payload", 400);

  const dataProviderRaw = typeof body.dataProvider === "string" ? body.dataProvider.toLowerCase() : null;
  const grandtechApiKey =
    typeof body.grandtechApiKey === "string" ? body.grandtechApiKey.trim() : undefined;
  const grandtechBaseUrl =
    typeof body.grandtechBaseUrl === "string" ? body.grandtechBaseUrl.trim() : undefined;
  const grandtechWebhookUrl =
    typeof body.grandtechWebhookUrl === "string" ? body.grandtechWebhookUrl.trim() : undefined;

  if (dataProviderRaw && dataProviderRaw !== "encart" && dataProviderRaw !== "grandtech") {
    return fail("dataProvider must be either 'encart' or 'grandtech'", 400);
  }

  if (dataProviderRaw) {
    await setSetting(prisma, SETTING_KEYS.dataProvider, dataProviderRaw as DataProvider);
  }

  if (typeof grandtechApiKey === "string") {
    // Allow clearing the key by sending empty string.
    await setSetting(prisma, SETTING_KEYS.grandtechApiKey, grandtechApiKey);
  }

  if (typeof grandtechBaseUrl === "string" && grandtechBaseUrl) {
    await setSetting(prisma, SETTING_KEYS.grandtechBaseUrl, grandtechBaseUrl.replace(/\/$/, ""));
  }

  if (typeof grandtechWebhookUrl === "string") {
    await setSetting(prisma, SETTING_KEYS.grandtechWebhookUrl, grandtechWebhookUrl);
  }

  const settings = await getAdminDataProviderSettings(prisma);
  return ok({
    message: "Settings updated",
    dataProvider: settings.dataProvider,
    grandtechApiKeySet: settings.grandtechApiKeySet,
    grandtechApiKeyPreview: settings.grandtechApiKey
      ? `${settings.grandtechApiKey.slice(0, 4)}••••${settings.grandtechApiKey.slice(-4)}`
      : "",
    grandtechBaseUrl: settings.grandtechBaseUrl,
    grandtechWebhookUrl: settings.grandtechWebhookUrl,
  });
}
