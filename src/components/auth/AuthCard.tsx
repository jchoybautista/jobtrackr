import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The left column's contents. No border or surface of its own — the layout's
 * frame already provides the edge, and nesting a second card inside it just
 * made the form look boxed in.
 */
export function AuthCard({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <Link
        href="/login"
        aria-label="JobTrackr"
        className="mb-9 flex items-center justify-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-ink text-base font-extrabold text-white">J</span>
        <span className="text-lg font-extrabold tracking-tight">JobTrackr</span>
      </Link>

      <div className="mb-7 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-base text-ink-3">{subtitle}</p>}
      </div>

      {children}

      {footer && <div className="mt-6 text-center text-sm text-ink-2">{footer}</div>}
    </div>
  );
}
