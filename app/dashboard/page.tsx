import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Dial } from "@/components/Dial";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      dialCoverUrl: true,
      dialCoverPosX: true,
      dialCoverPosY: true,
      dialCoverZoom: true,
    },
  });

  return (
    <Dial
      user={{
        email: session.user.email || "",
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
      }}
      dialCover={{
        url: row?.dialCoverUrl ?? null,
        posX: row?.dialCoverPosX ?? 50,
        posY: row?.dialCoverPosY ?? 50,
        zoom: row?.dialCoverZoom ?? 100,
      }}
    />
  );
}
