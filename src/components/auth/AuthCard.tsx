import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <Link href="/login" className="mb-6 flex items-center justify-center gap-2.5" aria-label="JobTrackr">
        <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-ink text-base font-extrabold text-white">J</span>
        <span className="text-lg font-extrabold tracking-tight">JobTrackr</span>
      </Link>

      <div className="rounded-2xl border border-line-2 bg-surface p-6">
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 mb-5 text-sm text-ink-3">{subtitle}</p>}
        <div className={subtitle ? "" : "mt-5"}>{children}</div>
      </div>

      {footer && <div className="mt-4 text-center text-sm text-ink-2">{footer}</div>}
    </div>
  );
}
