import { prisma } from "@/lib/prisma";

export type AppSettingsMap = {
  app_name: string;
  logo_url: string;
  logo_public_id: string;
  favicon_url: string;
  favicon_public_id: string;
  /** Raw HTML snippets (e.g. GTM): script/link/meta tags */
  inject_head: string;
  inject_body_start: string;
  inject_body_end: string;
  from_email: string;
  sendgrid_api_key: string;
  cloudinary_cloud_name: string;
  cloudinary_api_key: string;
  cloudinary_api_secret: string;
};

let cache: { at: number; data: AppSettingsMap } | null = null;
const TTL_MS = 60_000;

const defaults: AppSettingsMap = {
  app_name: "FutureGo",
  logo_url: "",
  logo_public_id: "",
  favicon_url: "",
  favicon_public_id: "",
  inject_head: "",
  inject_body_start: "",
  inject_body_end: "",
  from_email: process.env.SENDGRID_FROM_EMAIL || "nibir@webgrowth.io",
  sendgrid_api_key: "",
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY || "",
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET || "",
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
      if (r.key === "favicon_url") map.favicon_url = r.value;
      if (r.key === "favicon_public_id") map.favicon_public_id = r.value;
      if (r.key === "inject_head") map.inject_head = r.value;
      if (r.key === "inject_body_start") map.inject_body_start = r.value;
      if (r.key === "inject_body_end") map.inject_body_end = r.value;
      if (r.key === "from_email") map.from_email = r.value || defaults.from_email;
      if (r.key === "sendgrid_api_key") map.sendgrid_api_key = r.value;
      if (r.key === "cloudinary_cloud_name") map.cloudinary_cloud_name = r.value;
      if (r.key === "cloudinary_api_key") map.cloudinary_api_key = r.value;
      if (r.key === "cloudinary_api_secret") map.cloudinary_api_secret = r.value;
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
