import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jobtrackr.app"),
  title: "JobTrackr — Track every job application",
  description:
    "A beautiful job hunt tracker: kanban pipeline, follow-up reminders, and insights that help you land the offer.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "JobTrackr — Track every job application",
    description:
      "A beautiful job hunt tracker: kanban pipeline, follow-up reminders, and insights.",
    type: "website",
    url: "https://jobtrackr.app",
  },
  twitter: { card: "summary_large_image", title: "JobTrackr" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "JobTrackr",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "A beautiful job hunt tracker: kanban pipeline, follow-up reminders, and insights that help you land the offer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans`}>
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a href="#main" className="skip-link">Skip to main content</a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
