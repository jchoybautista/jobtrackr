import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { resolveScope } from "@/lib/auth/scope";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const scope = await resolveScope();
  // Middleware normally catches this; belt and braces, because rendering the
  // app with no scope would throw deep inside the store instead.
  if (!scope) redirect("/login");
  return <AppShell scope={scope}>{children}</AppShell>;
}
