import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/sup-admin";
import { prisma } from "@/lib/prisma";
import { emailTemplatePatchSchema } from "@/lib/validations";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.error === "Unauthorized" ? 401 : 403 }
    );
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ templates: [] });
  }

  const templates = await prisma.emailTemplate.findMany({
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      subject: true,
      htmlBody: true,
      variables: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      ...t,
      updatedAt: t.updatedAt.toISOString(),
    })),
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
  const parsed = emailTemplatePatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { key, subject, htmlBody, variables } = parsed.data;

  const exists = await prisma.emailTemplate.findUnique({ where: { key }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: `Unknown template key: ${key}` }, { status: 404 });
  }

  const updated = await prisma.emailTemplate.update({
    where: { key },
    data: {
      subject,
      htmlBody,
      ...(variables !== undefined ? { variables } : {}),
      updatedBy: gate.session.user.id ?? undefined,
    },
    select: {
      id: true,
      key: true,
      subject: true,
      htmlBody: true,
      variables: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    template: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
