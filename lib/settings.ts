import type { PrismaClient } from "@prisma/client";

export type DataProvider = "encart" | "grandtech";

export const SETTING_KEYS = {
  dataProvider: "data_provider",
  grandtechApiKey: "grandtech_api_key",
  grandtechBaseUrl: "grandtech_base_url",
  grandtechWebhookUrl: "grandtech_webhook_url",
} as const;

const DEFAULT_PROVIDER: DataProvider = "encart";
const DEFAULT_GRANDTECH_BASE_URL = "https://backend.grandtechub.cloud";

function normalizeProvider(value?: string | null): DataProvider {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "grandtech") return "grandtech";
  return "encart";
}

export async function getSetting(prisma: PrismaClient, key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(prisma: PrismaClient, key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getDataProvider(prisma: PrismaClient): Promise<DataProvider> {
  const fromDb = await getSetting(prisma, SETTING_KEYS.dataProvider);
  if (fromDb) return normalizeProvider(fromDb);
  return normalizeProvider(process.env.DATA_PROVIDER || DEFAULT_PROVIDER);
}

export async function getGrandTechApiKey(prisma: PrismaClient): Promise<string> {
  const fromDb = await getSetting(prisma, SETTING_KEYS.grandtechApiKey);
  if (fromDb && fromDb.trim()) return fromDb.trim();
  return (process.env.GRANDTECH_API_KEY || "").trim();
}

export async function getGrandTechBaseUrl(prisma: PrismaClient): Promise<string> {
  const fromDb = await getSetting(prisma, SETTING_KEYS.grandtechBaseUrl);
  if (fromDb && fromDb.trim()) return fromDb.trim().replace(/\/$/, "");
  return (process.env.GRANDTECH_BASE_URL || DEFAULT_GRANDTECH_BASE_URL).replace(/\/$/, "");
}

export async function getGrandTechWebhookUrl(prisma: PrismaClient): Promise<string> {
  const fromDb = await getSetting(prisma, SETTING_KEYS.grandtechWebhookUrl);
  if (fromDb && fromDb.trim()) return fromDb.trim();

  const fromEnv = (process.env.GRANDTECH_WEBHOOK_URL || "").trim();
  if (fromEnv) return fromEnv;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (appUrl) return `${appUrl}/api/webhooks/grandtech`;
  return "";
}

export async function getAdminDataProviderSettings(prisma: PrismaClient) {
  const [provider, apiKey, baseUrl, webhookUrl] = await Promise.all([
    getDataProvider(prisma),
    getGrandTechApiKey(prisma),
    getGrandTechBaseUrl(prisma),
    getGrandTechWebhookUrl(prisma),
  ]);

  return {
    dataProvider: provider,
    grandtechApiKey: apiKey,
    grandtechApiKeySet: Boolean(apiKey),
    grandtechBaseUrl: baseUrl,
    grandtechWebhookUrl: webhookUrl,
  };
}
