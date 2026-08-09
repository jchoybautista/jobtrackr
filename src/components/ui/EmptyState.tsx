import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  /** A button or link that gets the user out of the empty state. */
  action?: ReactNode;
  /** "page" fills a whole route; "card" sits inside a dashboard section. */
  size?: "page" | "card";
  className?: string;
}

/** One empty state for the whole app, so a blank card and a blank page read as
 *  the same idea at two scales: dashed outline, muted icon, what is missing,
 *  and — where there is one — the action that fills it. */
export function EmptyState({
  icon: Icon, title, body, action, size = "card", className = "",
}: EmptyStateProps) {
  const page = size === "page";
  return (
    <div
      className={`rounded-2xl border border-dashed border-line text-center ${
        page ? "bg-surface px-6 py-12" : "px-4 py-8"
      } ${className}`}
    >
      <Icon
        className={`mx-auto text-ink-3 ${page ? "mb-3 h-8 w-8" : "mb-2 h-5 w-5"}`}
        aria-hidden
      />
      <p className={page ? "text-base font-bold" : "text-sm font-bold"}>{title}</p>
      {body && (
        <p
          className={`mx-auto text-ink-3 ${
            page ? "mt-1 max-w-md text-base" : "mt-1 max-w-xs text-sm leading-relaxed"
          }`}
        >
          {body}
        </p>
      )}
      {action && <div className={page ? "mt-5" : "mt-3"}>{action}</div>}
    </div>
  );
}
