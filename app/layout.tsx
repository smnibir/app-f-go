import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { HtmlInjection } from "@/components/HtmlInjection";
import { getAppSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getAppSettings();
  const title = s.app_name?.trim() || "FutureGo";
  const fav = s.favicon_url?.trim();
  return {
    title,
    description: "Your personal life timeline",
    ...(fav ?
      {
        icons: {
          icon: [{ url: fav }],
        },
      }
    : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f9fa",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const s = await getAppSettings();

  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-900 antialiased">
        <HtmlInjection
          headHtml={s.inject_head}
          bodyStartHtml={s.inject_body_start}
          bodyEndHtml={s.inject_body_end}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
