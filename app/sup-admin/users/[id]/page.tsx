import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supAdminUserDetailSelect } from "@/lib/sup-admin-users";
import { SupAdminUserDetailForm } from "@/components/sup-admin/SupAdminUserDetailForm";

export default async function SupAdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const actorRole = session?.user?.role;
  if (actorRole !== "ADMIN" && actorRole !== "SUPER_ADMIN") {
    notFound();
  }
  if (!session?.user?.id) {
    notFound();
  }

  if (!process.env.DATABASE_URL?.trim()) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: supAdminUserDetailSelect,
  });
  if (!user) {
    notFound();
  }

  if (actorRole === "ADMIN" && user.role === "SUPER_ADMIN") {
    notFound();
  }

  const initialUser = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    emailVerified: user.emailVerified?.toISOString() ?? null,
  };

  return (
    <div>
      <SupAdminUserDetailForm
        initialUser={initialUser}
        actorRole={actorRole}
        actorId={session.user.id}
      />
    </div>
  );
}
