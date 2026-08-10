import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { resolveIdentity } from "@/lib/auth/scope";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const identity = await resolveIdentity();
  // Middleware normally catches this; belt and braces, because rendering the
  // app with no scope would throw deep inside the store instead.
  if (!identity) redirect("/login");
  return <AppShell scope={identity.scope} email={identity.email}>{children}</AppShell>;
}
