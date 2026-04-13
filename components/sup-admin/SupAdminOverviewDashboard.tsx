import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type OverviewRecentUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
};

export type SupAdminOverviewDashboardProps = {
  actorRole: string | undefined;
  totals: {
    users: number;
    active: number;
    suspended: number;
    verified: number;
    timelineEntries: number;
    files: number;
  };
  roles: { endUser: number; admin: number; superAdmin: number };
  timeline: { draft: number; published: number; scheduled: number };
  assets: { image: number; video: number; audio: number; pdf: number };
  signupsByDay: { label: string; count: number }[];
  signupsWeek: number;
  signupsPrevWeek: number;
  entriesLast7d: number;
  recent: OverviewRecentUser[];
};

function Sparkline({ points }: { points: { label: string; count: number }[] }) {
  if (!points.length) return null;
  const max = Math.max(1, ...points.map((p) => p.count));
  const w = 320;
  const h = 72;
  const pad = 4;
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const d = points
    .map((p, i) => {
      const x = pad + i * step;
      const y = h - pad - ((p.count / max) * (h - pad * 2) || 0);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const peak = Math.max(0, ...points.map((p) => p.count));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-20 w-full max-w-full text-[#0056b3]"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`}
          fill="url(#sparkFill)"
          className="text-[#0056b3]"
        />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="mt-1 text-center text-xs text-gray-500">
        Last 14 days · peak single-day signups:{" "}
        <span className="font-semibold text-navy">{peak}</span>
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon,
  accent = "navy",
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  accent?: "navy" | "emerald" | "amber" | "violet";
}) {
  const accentBefore =
    accent === "emerald" ?
      "before:from-emerald-500/15 before:to-emerald-600/5"
    : accent === "amber" ?
      "before:from-amber-500/15 before:to-amber-600/5"
    : accent === "violet" ?
      "before:from-violet-500/15 before:to-violet-600/5"
    : "before:from-[#0056b3]/20 before:to-[#0056b3]/5";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:to-transparent",
        accentBefore
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-navy">{value}</p>
          {hint ?
            <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
          : null}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-[#0056b3]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="tabular-nums text-gray-600">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={cn("h-full rounded-full transition-[width]", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SupAdminOverviewDashboard({
  actorRole,
  totals,
  roles,
  timeline,
  assets,
  signupsByDay,
  signupsWeek,
  signupsPrevWeek,
  entriesLast7d,
  recent,
}: SupAdminOverviewDashboardProps) {
  const roleMax = Math.max(roles.endUser, roles.admin, roles.superAdmin, 1);
  const tlMax = Math.max(timeline.draft, timeline.published, timeline.scheduled, 1);
  const assetMax = Math.max(assets.image, assets.video, assets.audio, assets.pdf, 1);
  const weekDelta =
    signupsPrevWeek > 0 ? Math.round(((signupsWeek - signupsPrevWeek) / signupsPrevWeek) * 100) : signupsWeek > 0 ? 100 : 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-[#b3d9f2]/80 bg-gradient-to-br from-[#e8f4fc] via-white to-[#f0f7ff] px-6 py-8 shadow-md md:px-10 md:py-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#0056b3]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-[#0056b3]/5 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0056b3]/80">Analytics</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy md:text-4xl">Operations dashboard</h1>
          <p className="mt-2 max-w-2xl text-base text-gray-600">
            Live snapshot of users, content, and storage. Drill into each area from the sidebar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/sup-admin/users"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0056b3] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004a9c]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M16 11a3 3 0 100-6 3 3 0 000 6zM8 13a3 3 0 100-6 3 3 0 000 6z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M3.5 20.5v-.5a4.5 4.5 0 014.5-4.5M20.5 20.5v-.5a4.5 4.5 0 00-4.5-4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Manage users
            </Link>
            <Link
              href="/sup-admin/settings"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-navy shadow-sm transition hover:bg-gray-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M19.4 15l.06.06a2 2 0 010 2.83l-.06.06M4.6 15a1.65 1.65 0 00-.33 1.82M4.6 9a1.65 1.65 0 01-.33-1.82M19.4 9l.06-.06a2 2 0 000-2.83l-.06-.06"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Branding &amp; integrations
            </Link>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total users"
          value={totals.users}
          hint={`${totals.active} active · ${totals.suspended} suspended`}
          accent="navy"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M16 11a3 3 0 100-6 3 3 0 000 6zM8 13a3 3 0 100-6 3 3 0 000 6z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M3.5 20.5v-.5a4.5 4.5 0 014.5-4.5M20.5 20.5v-.5a4.5 4.5 0 00-4.5-4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          }
        />
        <StatCard
          title="Verified emails"
          value={totals.verified}
          hint={
            totals.users > 0 ?
              `${Math.round((totals.verified / totals.users) * 100)}% of all accounts`
            : "—"
          }
          accent="emerald"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 12l2 2 4-4M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <StatCard
          title="Timeline entries"
          value={totals.timelineEntries}
          hint={`${entriesLast7d} new in the last 7 days`}
          accent="violet"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 5.5h6v6H4v-6zm10 0h6v6h-6v-6zM4 16.5h6v2H4v-2zm10-5h6v7h-6v-7z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <StatCard
          title="Media files"
          value={totals.files}
          hint="Across all timeline events"
          accent="amber"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M4 6.5h16v11H4v-11z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Signups chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-navy">New registrations</h2>
              <p className="text-sm text-gray-500">Daily signups over the last 14 days</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">vs prior week</p>
              <p
                className={cn(
                  "text-lg font-bold tabular-nums",
                  weekDelta >= 0 ? "text-emerald-700" : "text-amber-800"
                )}
              >
                {weekDelta >= 0 ? "+" : ""}
                {weekDelta}%
              </p>
            </div>
          </div>
          <Sparkline points={signupsByDay} />
        </div>

        {/* Timeline status */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-navy">Timeline by status</h2>
          <p className="mb-5 text-sm text-gray-500">Draft, published, and scheduled events</p>
          <div className="space-y-4">
            <BarRow label="Published" value={timeline.published} max={tlMax} color="bg-emerald-500" />
            <BarRow label="Scheduled" value={timeline.scheduled} max={tlMax} color="bg-[#0056b3]" />
            <BarRow label="Draft" value={timeline.draft} max={tlMax} color="bg-amber-400" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Roles */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-navy">Users by role</h2>
          <p className="mb-5 text-sm text-gray-500">Permission distribution</p>
          <div className="space-y-4">
            <BarRow label="End users" value={roles.endUser} max={roleMax} color="bg-slate-400" />
            <BarRow label="Admins" value={roles.admin} max={roleMax} color="bg-[#0056b3]" />
            <BarRow label="Super admins" value={roles.superAdmin} max={roleMax} color="bg-navy" />
          </div>
        </div>

        {/* Assets */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-navy">Media by type</h2>
          <p className="mb-5 text-sm text-gray-500">Uploaded assets across the platform</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["Images", assets.image, "bg-sky-500"],
                ["Videos", assets.video, "bg-violet-500"],
                ["Audio", assets.audio, "bg-amber-500"],
                ["PDFs", assets.pdf, "bg-rose-500"],
              ] as const
            ).map(([lab, n, c]) => (
              <div
                key={lab}
                className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-4 text-center"
              >
                <p className="text-2xl font-bold tabular-nums text-navy">{n}</p>
                <p className="mt-1 text-xs font-medium text-gray-600">{lab}</p>
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-200">
                  <div className={cn("h-full rounded-full", c)} style={{ width: `${(n / assetMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-navy">Recent registrations</h2>
            <p className="text-sm text-gray-500">Newest accounts first</p>
          </div>
          <Link
            href="/sup-admin/users"
            className="text-sm font-semibold text-[#0056b3] hover:underline"
          >
            View all users →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-base">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="py-3 pr-4 font-semibold">Name</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Role</th>
                <th className="py-3 pr-4 font-semibold">Joined</th>
                <th className="py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ?
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    No users yet.
                  </td>
                </tr>
              : recent.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4">{r.name || "—"}</td>
                    <td className="py-3 pr-4">{r.email}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase text-gray-800">
                        {r.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{format(r.createdAt, "MMM d, yyyy")}</td>
                    <td className="py-3 text-right">
                      {actorRole === "ADMIN" && r.role === "SUPER_ADMIN" ?
                        <span className="text-sm text-gray-400" title="Only a super admin can open this account">
                          —
                        </span>
                      : <Link
                          href={`/sup-admin/users/${r.id}`}
                          className="font-semibold text-[#0056b3] hover:underline"
                        >
                          View / edit
                        </Link>
                      }
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
