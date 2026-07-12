import type { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const metadata: Metadata = {
  title: "Dashboard — JobTrackr",
  description:
    "See your job search at a glance: active applications, response and interview rates, offers, a weekly applications chart, and follow-ups needing attention.",
};

export default function Page() {
  return <DashboardPage />;
}
