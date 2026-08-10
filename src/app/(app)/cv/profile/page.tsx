import type { Metadata } from "next";
import { ProfileEditorClient } from "@/components/cv/ProfileEditorClient";

export const metadata: Metadata = {
  title: "Profile — JobTrackr",
  description:
    "Edit your master CV profile — contact details, photo, experience, skills, and more that every tailored CV is built from.",
};

export default function Page() {
  return <ProfileEditorClient />;
}
