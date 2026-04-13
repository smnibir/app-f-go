import type { Prisma } from "@prisma/client";

/** Safe fields for admin user list (never includes password). */
export const supAdminUserListSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  status: true,
  emailVerified: true,
  createdAt: true,
  _count: { select: { timeline: true } },
} satisfies Prisma.UserSelect;

export type SupAdminUserListRow = Prisma.UserGetPayload<{
  select: typeof supAdminUserListSelect;
}>;

/** Detail view for admin user page (no password). */
export const supAdminUserDetailSelect = {
  id: true,
  email: true,
  name: true,
  address: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { timeline: true } },
} satisfies Prisma.UserSelect;

export type SupAdminUserDetailRow = Prisma.UserGetPayload<{
  select: typeof supAdminUserDetailSelect;
}>;
