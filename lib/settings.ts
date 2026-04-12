import { prisma } from "@/lib/prisma";

export type AppSettingsMap = {
  app_name: string;
  logo_url: string;
  logo_public_id: string;
  from_email: string;
  sendgrid_api_key: string;
};

let cache: { at: number; data: AppSettingsMap } | null = null;
const TTL_MS = 60_000;

const defaults: AppSettingsMap = {
  app_name: "FutureGo",
  logo_url: "",
  logo_public_id: "",
  from_email: process.env.SENDGRID_FROM_EMAIL || "nibir@webgrowth.io",
  sendgrid_api_key: "",
};

export async function getAppSettings(): Promise<AppSettingsMap> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.data;

  if (!process.env.DATABASE_URL?.trim()) {
    return { ...defaults };
  }

  try {
    const rows = await prisma.appSettings.findMany();
    const map = { ...defaults };
    for (const r of rows) {
      if (r.key === "app_name") map.app_name = r.value || defaults.app_name;
      if (r.key === "logo_url") map.logo_url = r.value;
      if (r.key === "logo_public_id") map.logo_public_id = r.value;
      if (r.key === "from_email") map.from_email = r.value || defaults.from_email;
      if (r.key === "sendgrid_api_key") map.sendgrid_api_key = r.value;
    }
    cache = { at: now, data: map };
    return map;
  } catch {
    return { ...defaults };
  }
}

export function invalidateSettingsCache() {
  cache = null;
}
