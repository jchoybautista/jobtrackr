import type { Application } from "./types";

const DAY = 86_400_000;

function compactAmount(n: number): string {
  return n >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : n.toLocaleString("en-US");
}

function money(n: number, currency?: string): string {
  const sym = !currency || currency === "USD" ? "$" : `${currency} `;
  return `${sym}${compactAmount(n)}`;
}

export function formatSalary(a: Application): string | null {
  if (a.salaryMin != null && a.salaryMax != null) {
    return `${money(a.salaryMin, a.currency)}–${compactAmount(a.salaryMax)}`;
  }
  const single = a.salaryMin ?? a.salaryMax;
  return single != null ? money(single, a.currency) : null;
}

export function relativeDays(iso: string, nowIso: string): string {
  const days = Math.floor((Date.parse(nowIso) - Date.parse(iso)) / DAY);
  if (days === 0) return "today";
  if (days > 0) return `${days}d ago`;
  return `in ${-days}d`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
