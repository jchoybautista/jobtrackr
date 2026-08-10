import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password — JobTrackr",
  description: "Request a link to set a new JobTrackr password.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ForgotPasswordForm />;
}
