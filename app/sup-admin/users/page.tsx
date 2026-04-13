import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SupAdminUsersPanel } from "@/components/sup-admin/SupAdminUsersPanel";
import type { SupAdminUserRow } from "@/components/sup-admin/SupAdminUsersPanel";
import { supAdminUserListSelect } from "@/lib/sup-admin-users";

const TAKE = 25;

export default async function SupAdminUsersPage() {
  const session = await auth();
  const actorRole =
    session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN" ?
      session.user.role
    : "ADMIN";

  const dbConnected = !!process.env.DATABASE_URL?.trim();
  let initialUsers: SupAdminUserRow[] = [];
  let initialTotal = 0;
  let skipInitialFetch = !dbConnected;

  if (dbConnected) {
    try {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          take: TAKE,
          skip: 0,
          orderBy: { createdAt: "desc" },
          select: supAdminUserListSelect,
        }),
        prisma.user.count(),
      ]);
      initialUsers = users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        emailVerified: u.emailVerified?.toISOString() ?? null,
      }));
      initialTotal = total;
      skipInitialFetch = true;
    } catch {
      skipInitialFetch = false;
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-navy">Users</h1>
      <p className="mb-8 text-base text-gray-600">
        Search by email or name, filter by role and status, and open any user with{" "}
        <strong className="font-semibold text-gray-800">View / edit</strong> to review details or
        change name, role, and status. Passwords are never returned from the API.
      </p>
      <SupAdminUsersPanel
        initialUsers={initialUsers}
        initialTotal={initialTotal}
        initialSkip={0}
        initialTake={TAKE}
        dbConnected={dbConnected}
        skipInitialFetch={skipInitialFetch}
        actorRole={actorRole}
      />
    </div>
  );
}
