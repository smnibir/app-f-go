import { subDays, startOfDay, format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SupAdminOverviewDashboard } from "@/components/sup-admin/SupAdminOverviewDashboard";

export default async function SupAdminOverviewPage() {
  const session = await auth();
  const actorRole = session?.user?.role;

  const empty = {
    totals: {
      users: 0,
      active: 0,
      suspended: 0,
      verified: 0,
      timelineEntries: 0,
      files: 0,
    },
    roles: { endUser: 0, admin: 0, superAdmin: 0 },
    timeline: { draft: 0, published: 0, scheduled: 0 },
    assets: { image: 0, video: 0, audio: 0, pdf: 0 },
    signupsByDay: [] as { label: string; count: number }[],
    signupsWeek: 0,
    signupsPrevWeek: 0,
    entriesLast7d: 0,
    recent: [] as {
      id: string;
      name: string | null;
      email: string;
      role: string;
      createdAt: Date;
    }[],
  };

  if (!process.env.DATABASE_URL?.trim()) {
    return (
      <SupAdminOverviewDashboard
        actorRole={actorRole}
        {...empty}
      />
    );
  }

  try {
    const today = startOfDay(new Date());
    const rollingWeekStart = subDays(today, 6);
    const prevWeekEnd = subDays(rollingWeekStart, 1);
    const prevWeekStart = subDays(rollingWeekStart, 7);
    const fourteenDaysAgo = subDays(today, 13);

    const dayKeys: string[] = [];
    for (let i = 13; i >= 0; i--) {
      dayKeys.push(format(subDays(today, i), "yyyy-MM-dd"));
    }

    const [
      users,
      active,
      suspended,
      verified,
      timelineEntries,
      files,
      roleUser,
      roleAdmin,
      roleSuper,
      draft,
      published,
      scheduled,
      img,
      vid,
      aud,
      pdf,
      signupsWeek,
      signupsPrevWeek,
      entriesLast7d,
      signupRows,
      recent,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
      prisma.timelineEntry.count(),
      prisma.asset.count(),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
      prisma.timelineEntry.count({ where: { status: "DRAFT" } }),
      prisma.timelineEntry.count({ where: { status: "PUBLISHED" } }),
      prisma.timelineEntry.count({ where: { status: "SCHEDULED" } }),
      prisma.asset.count({ where: { type: "IMAGE" } }),
      prisma.asset.count({ where: { type: "VIDEO" } }),
      prisma.asset.count({ where: { type: "AUDIO" } }),
      prisma.asset.count({ where: { type: "PDF" } }),
      prisma.user.count({ where: { createdAt: { gte: rollingWeekStart } } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: prevWeekStart,
            lte: prevWeekEnd,
          },
        },
      }),
      prisma.timelineEntry.count({
        where: { createdAt: { gte: rollingWeekStart } },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
    ]);

    const counts = new Map<string, number>();
    dayKeys.forEach((k) => counts.set(k, 0));
    signupRows.forEach((u) => {
      const k = format(startOfDay(u.createdAt), "yyyy-MM-dd");
      if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    const signupsByDay = dayKeys.map((k) => ({
      label: format(new Date(`${k}T12:00:00`), "MMM d"),
      count: counts.get(k) ?? 0,
    }));

    return (
      <SupAdminOverviewDashboard
        actorRole={actorRole}
        totals={{
          users,
          active,
          suspended,
          verified,
          timelineEntries,
          files,
        }}
        roles={{ endUser: roleUser, admin: roleAdmin, superAdmin: roleSuper }}
        timeline={{ draft, published, scheduled }}
        assets={{ image: img, video: vid, audio: aud, pdf }}
        signupsByDay={signupsByDay}
        signupsWeek={signupsWeek}
        signupsPrevWeek={signupsPrevWeek}
        entriesLast7d={entriesLast7d}
        recent={recent}
      />
    );
  } catch {
    return <SupAdminOverviewDashboard actorRole={actorRole} {...empty} />;
  }
}
