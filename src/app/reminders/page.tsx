import type { Metadata } from "next";
import { RemindersPage } from "@/components/reminders/RemindersPage";

export const metadata: Metadata = { title: "Reminders — JobTrackr" };

export default function Page() {
  return <RemindersPage />;
}
