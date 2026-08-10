import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = {
  title: "Settings — JobTrackr",
  description:
    "Manage your JobTrackr workspace: customize pipeline stages, tune follow-up nudge timing and currency, and import or export all your job search data.",
};

export default function Page() {
  return <SettingsPage />;
}
