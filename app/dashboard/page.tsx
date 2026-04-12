import { auth } from "@/lib/auth";
import { Dial } from "@/components/Dial";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  return (
    <Dial
      user={{
        email: session.user.email || "",
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
      }}
    />
  );
}
