import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JobTrackr — Track every job application",
  description:
    "A beautiful job hunt tracker: kanban pipeline, follow-up reminders, and insights that help you land the offer.",
  openGraph: {
    title: "JobTrackr — Track every job application",
    description:
      "A beautiful job hunt tracker: kanban pipeline, follow-up reminders, and insights.",
    type: "website",
    url: "https://jobtrackr.app",
  },
  twitter: { card: "summary_large_image", title: "JobTrackr" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans`}>
        <a href="#main" className="skip-link">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
