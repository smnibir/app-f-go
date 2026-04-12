import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getAppSettings();
  return NextResponse.json({
    app_name: s.app_name,
    logo_url: s.logo_url || null,
  });
}
