import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password — JobTrackr",
  description: "Choose a new password for your JobTrackr account.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ResetPasswordForm />;
}
