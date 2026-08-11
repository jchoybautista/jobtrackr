import type { Metadata } from "next";
import { resolveIdentity } from "@/lib/auth/scope";
import { ProfileEditorClient } from "@/components/cv/ProfileEditorClient";

export const metadata: Metadata = {
  title: "Profile — JobTrackr",
  description:
    "Edit your master CV profile — contact details, photo, experience, skills, and more that every tailored CV is built from.",
};

export default async function Page() {
  // Memoized by resolveIdentity's cache() — the layout already resolved this
  // once for the same request, so this is not a second round trip.
  const identity = await resolveIdentity();
  return <ProfileEditorClient accountEmail={identity?.email ?? null} />;
}
