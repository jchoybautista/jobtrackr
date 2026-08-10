import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create an account — JobTrackr",
  description: "Create a JobTrackr account to track applications, follow-ups, and interviews in one place.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SignupForm />;
}
