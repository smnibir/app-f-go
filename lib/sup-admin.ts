import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

export async function requireAdmin(): Promise<
  | { session: Session; error: null }
  | { session: null; error: "Unauthorized" | "Forbidden" }
> {
  const session = await auth();
  if (!session?.user?.id) return { session: null, error: "Unauthorized" };
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return { session: null, error: "Forbidden" };
  }
  return { session, error: null };
}

export async function requireSuperAdmin(): Promise<
  | { session: Session; error: null }
  | { session: null; error: "Unauthorized" | "Forbidden" }
> {
  const session = await auth();
  if (!session?.user?.id) return { session: null, error: "Unauthorized" };
  if (session.user.role !== "SUPER_ADMIN") {
    return { session: null, error: "Forbidden" };
  }
  return { session, error: null };
}
