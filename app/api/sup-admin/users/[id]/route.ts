import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/sup-admin";
import { prisma } from "@/lib/prisma";
import { supAdminUserDetailSelect } from "@/lib/sup-admin-users";
import { adminUserPatchSchema } from "@/lib/validations";
import type { Role, UserStatus } from "@prisma/client";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: supAdminUserDetailSelect,
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const actor = gate.session.user.role;
  if (actor === "ADMIN" && user.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      emailVerified: user.emailVerified?.toISOString() ?? null,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = adminUserPatchSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] || "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const actorId = gate.session.user.id!;
  const actorRole = gate.session.user.role;

  if (actorRole === "ADMIN" && existing.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Admins cannot modify super admin accounts." }, { status: 403 });
  }

  const { name, role, status } = parsed.data;
  if (role === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only a super admin can assign the super admin role." },
      { status: 403 }
    );
  }

  if (id === actorId && status === "SUSPENDED") {
    return NextResponse.json({ error: "You cannot suspend your own account." }, { status: 400 });
  }

  const data: { name?: string | null; role?: Role; status?: UserStatus } = {};
  if (name !== undefined) data.name = name.trim() === "" ? null : name.trim();
  if (role !== undefined) data.role = role as Role;
  if (status !== undefined) data.status = status as UserStatus;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: supAdminUserDetailSelect,
  });

  return NextResponse.json({
    user: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      emailVerified: updated.emailVerified?.toISOString() ?? null,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const actorId = gate.session.user.id!;
  const actorRole = gate.session.user.role;

  if (id === actorId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      avatarPublicId: true,
      dialCoverPublicId: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (actorRole === "ADMIN" && existing.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Admins cannot delete super admin accounts." }, { status: 403 });
  }

  if (existing.role === "SUPER_ADMIN") {
    const superCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (superCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last super admin account." },
        { status: 400 }
      );
    }
  }

  try {
    if (existing.avatarPublicId) {
      await deleteCloudinaryAsset(existing.avatarPublicId, "image");
    }
    if (existing.dialCoverPublicId) {
      await deleteCloudinaryAsset(existing.dialCoverPublicId, "image");
    }
  } catch {
    /* best-effort cleanup */
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
