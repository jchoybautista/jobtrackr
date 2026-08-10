import type { Metadata } from "next";
import { RemindersPage } from "@/components/reminders/RemindersPage";

export const metadata: Metadata = {
  title: "Reminders — JobTrackr",
  description:
    "Never miss a follow-up or interview again. JobTrackr surfaces reminders due now, nudges for applications gone silent, and everything coming up next.",
};

export default function Page() {
  return <RemindersPage />;
}
