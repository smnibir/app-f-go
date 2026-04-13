import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/sup-admin";
import { prisma } from "@/lib/prisma";
import { supAdminUserListSelect } from "@/lib/sup-admin-users";
import { adminUserCreateSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/email";
import { getAppSettings } from "@/lib/settings";
import type { Role, UserStatus } from "@prisma/client";

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "USER"];
const STATUSES: UserStatus[] = ["ACTIVE", "SUSPENDED"];

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.error === "Unauthorized" ? 401 : 403 }
    );
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ users: [], total: 0 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const roleParam = url.searchParams.get("role")?.trim().toUpperCase();
  const statusParam = url.searchParams.get("status")?.trim().toUpperCase();

  const skip = Math.max(0, Number.parseInt(url.searchParams.get("skip") || "0", 10) || 0);
  const takeRaw = Number.parseInt(url.searchParams.get("take") || "25", 10) || 25;
  const take = Math.min(100, Math.max(1, takeRaw));

  const roleFilter =
    roleParam && ROLES.includes(roleParam as Role) ? (roleParam as Role) : undefined;
  const statusFilter =
    statusParam && STATUSES.includes(statusParam as UserStatus) ?
      (statusParam as UserStatus)
    : undefined;

  const searchWhere =
    q ?
      {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const where = {
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(searchWhere ? searchWhere : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: Object.keys(where).length ? where : undefined,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: supAdminUserListSelect,
    }),
    prisma.user.count({
      where: Object.keys(where).length ? where : undefined,
    }),
  ]);

  return NextResponse.json({ users, total, skip, take });
}

export async function POST(req: Request) {
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
  const parsed = adminUserCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.confirmPassword?.[0] ||
      parsed.error.flatten().fieldErrors.password?.[0] ||
      "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { name, email, password, role, sendWelcomeEmail } = parsed.data;
  const actor = gate.session.user.role;

  if (role === "SUPER_ADMIN" && actor !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only a super admin can create another super admin." },
      { status: 403 }
    );
  }

  const emailNorm = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: emailNorm,
      name,
      password: passwordHash,
      role: role as Role,
      emailVerified: new Date(),
      createdBy: gate.session.user.id ?? undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  if (sendWelcomeEmail) {
    const settings = await getAppSettings();
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    try {
      await sendEmail({
        to: emailNorm,
        templateKey: "welcome_user",
        variables: {
          name,
          temp_password: password,
          link: `${base}/`,
          app_name: settings.app_name,
          logo_url: settings.logo_url || "",
        },
      });
    } catch {
      /* email optional; user still created */
    }
  }

  return NextResponse.json({
    user: { ...user, createdAt: user.createdAt.toISOString() },
  });
}
