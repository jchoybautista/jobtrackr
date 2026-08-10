import type { Metadata } from "next";
import { CvEditorClient } from "@/components/cv/CvEditorClient";

export const metadata: Metadata = {
  title: "Edit CV — JobTrackr",
  description:
    "Tailor a CV: edit contact details, toggle and reorder sections, and refine content with a live A4 preview.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CvEditorClient id={id} />;
}
