import type { Metadata } from "next";
import { ApplicationsPage } from "@/components/applications/ApplicationsPage";

export const metadata: Metadata = {
  title: "Applications — JobTrackr",
  description: "Every job application in one filterable, sortable table — filter by status or outcome and open any application's details.",
};

export default function Page() {
  return <ApplicationsPage />;
}
