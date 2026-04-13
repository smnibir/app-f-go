import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SupAdminOverviewPage() {
  const session = await auth();
  const actorRole = session?.user?.role;
  let users = 0;
  let active = 0;
  let entries = 0;
  let files = 0;
  let recent: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: Date;
  }[] = [];

  if (process.env.DATABASE_URL?.trim()) {
    try {
      [users, active, entries, files] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.timelineEntry.count(),
        prisma.asset.count(),
      ]);
      recent = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
    } catch {
      /* DB unreachable during build or offline */
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-navy">Overview</h1>
      <p className="mb-8 text-base text-gray-600">
        High-level counts and the latest signups. Use the sidebar for detailed management.
      </p>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Users", users],
          ["Active Users", active],
          ["Timeline Entries", entries],
          ["Files Uploaded", files],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <p className="text-[15px] font-medium text-gray-600">{label}</p>
            <p className="mt-2 text-3xl font-bold text-navy">{val}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-navy">Recent registrations</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-base">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Joined</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-3 pr-4">{r.name || "—"}</td>
                  <td className="py-3 pr-4">{r.email}</td>
                  <td className="py-3 pr-4">{r.role}</td>
                  <td className="py-3 pr-4">{r.createdAt.toLocaleDateString()}</td>
                  <td className="py-3 text-right">
                    {actorRole === "ADMIN" && r.role === "SUPER_ADMIN" ?
                      <span className="text-sm text-gray-400" title="Only a super admin can open this account">
                        —
                      </span>
                    : <Link
                        href={`/sup-admin/users/${r.id}`}
                        className="font-semibold text-navy hover:underline"
                      >
                        View / edit
                      </Link>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
