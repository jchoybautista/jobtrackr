import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — JobTrackr",
  description: "Sign in to JobTrackr to track your job applications, follow-ups, and interviews.",
  robots: { index: false, follow: false },
};

export default function Page() {
  // useSearchParams needs a Suspense boundary to keep the route static.
  return <Suspense><LoginForm /></Suspense>;
}
