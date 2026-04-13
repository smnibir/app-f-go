import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/sup-admin";
import { prisma } from "@/lib/prisma";
import { invalidateSettingsCache, getAppSettings } from "@/lib/settings";
import { supAdminSettingsPatchSchema } from "@/lib/validations";
import { maskApiKey } from "@/lib/mask-secret";
import { configureCloudinaryWithSettings, deleteCloudinaryAsset } from "@/lib/cloudinary";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.error === "Unauthorized" ? 401 : 403 }
    );
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      app_name: "FutureGo",
      logo_url: "",
      logo_public_id: "",
      from_email: "",
      sendgrid: { masked: "", configured: false },
      cloudinary_cloud_name: "",
      cloudinary_api_key: { masked: "", configured: false },
      cloudinary_api_secret: { masked: "", configured: false },
    });
  }

  const s = await getAppSettings();
  const sendgrid = maskApiKey(s.sendgrid_api_key);
  const cKey = maskApiKey(s.cloudinary_api_key);
  const cSecret = maskApiKey(s.cloudinary_api_secret);

  return NextResponse.json({
    app_name: s.app_name,
    logo_url: s.logo_url || "",
    logo_public_id: s.logo_public_id || "",
    from_email: s.from_email || "",
    sendgrid: { masked: sendgrid.masked, configured: sendgrid.configured },
    cloudinary_cloud_name: s.cloudinary_cloud_name || "",
    cloudinary_api_key: { masked: cKey.masked, configured: cKey.configured },
    cloudinary_api_secret: { masked: cSecret.masked, configured: cSecret.configured },
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.error === "Unauthorized" ? 401 : 403 }
    );
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = supAdminSettingsPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const rows = await prisma.appSettings.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  async function upsert(key: string, value: string) {
    await prisma.appSettings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  if (body.app_name !== undefined) await upsert("app_name", body.app_name);
  if (body.from_email !== undefined) await upsert("from_email", body.from_email);

  if (body.sendgrid_api_key !== undefined) {
    const t = body.sendgrid_api_key.trim();
    if (t.length > 0) {
      if (t.includes("•")) {
        return NextResponse.json(
          { error: "Paste a new API key, not the masked value." },
          { status: 400 }
        );
      }
      await upsert("sendgrid_api_key", t);
    }
  }

  if (body.logo_url !== undefined || body.logo_public_id !== undefined) {
    const prevPid = map.logo_public_id || "";
    const nextUrl = body.logo_url !== undefined ? body.logo_url : map.logo_url || "";
    const nextPid = body.logo_public_id !== undefined ? body.logo_public_id : prevPid;

    if (prevPid && nextPid !== prevPid) {
      if (await configureCloudinaryWithSettings()) {
        await deleteCloudinaryAsset(prevPid, "image");
      }
    }
    if (body.logo_url !== undefined) await upsert("logo_url", nextUrl);
    if (body.logo_public_id !== undefined) await upsert("logo_public_id", nextPid);
  }

  if (body.cloudinary_cloud_name !== undefined) {
    await upsert("cloudinary_cloud_name", body.cloudinary_cloud_name.trim());
  }

  if (body.cloudinary_api_key !== undefined) {
    const t = body.cloudinary_api_key.trim();
    if (t.length > 0) {
      if (t.includes("•")) {
        return NextResponse.json(
          { error: "Paste a new Cloudinary API key, not the masked value." },
          { status: 400 }
        );
      }
      await upsert("cloudinary_api_key", t);
    }
  }

  if (body.cloudinary_api_secret !== undefined) {
    const t = body.cloudinary_api_secret.trim();
    if (t.length > 0) {
      if (t.includes("•")) {
        return NextResponse.json(
          { error: "Paste a new Cloudinary API secret, not the masked value." },
          { status: 400 }
        );
      }
      await upsert("cloudinary_api_secret", t);
    }
  }

  invalidateSettingsCache();

  const s = await getAppSettings();
  const sg = maskApiKey(s.sendgrid_api_key);
  const ck = maskApiKey(s.cloudinary_api_key);
  const cs = maskApiKey(s.cloudinary_api_secret);

  return NextResponse.json({
    ok: true,
    settings: {
      app_name: s.app_name,
      logo_url: s.logo_url || "",
      logo_public_id: s.logo_public_id || "",
      from_email: s.from_email || "",
      sendgrid: { masked: sg.masked, configured: sg.configured },
      cloudinary_cloud_name: s.cloudinary_cloud_name || "",
      cloudinary_api_key: { masked: ck.masked, configured: ck.configured },
      cloudinary_api_secret: { masked: cs.masked, configured: cs.configured },
    },
  });
}
