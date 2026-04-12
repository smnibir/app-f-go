import { getAppSettings } from "@/lib/settings";

/**
 * Admin-configured logos can point at any HTTPS origin; use <img> so we never
 * depend on next/image remotePatterns for arbitrary URLs.
 */
export async function AppLogo() {
  const s = await getAppSettings();
  if (s.logo_url?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={s.logo_url}
        alt={s.app_name || "App logo"}
        className="h-auto max-h-[40px] w-auto object-contain"
      />
    );
  }
  return (
    <span className="font-sans text-2xl font-bold tracking-tight text-navy">
      {s.app_name || "FutureGo"}
    </span>
  );
}
