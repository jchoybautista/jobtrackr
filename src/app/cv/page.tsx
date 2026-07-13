import type { Metadata } from "next";
import { CvLibraryClient } from "@/components/cv/CvLibraryClient";

export const metadata: Metadata = {
  title: "CV Builder — JobTrackr",
  description:
    "Build tailored CVs from your master profile — three polished templates with live A4 preview and one-click PDF export.",
};

export default function Page() {
  return <CvLibraryClient />;
}
