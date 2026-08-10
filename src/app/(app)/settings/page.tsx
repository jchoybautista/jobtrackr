import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { resolveIdentity } from "@/lib/auth/scope";

export const metadata: Metadata = {
  title: "Settings — JobTrackr",
  description:
    "Manage your JobTrackr workspace: customize pipeline stages, tune follow-up nudge timing and currency, and import or export all your job search data.",
};

export default async function Page() {
  // Settings is the only account surface that exists on mobile — the sidebar
  // that holds AccountMenu is hidden below 768px.
  const identity = await resolveIdentity();
  return <SettingsPage email={identity?.email ?? null} />;
}
