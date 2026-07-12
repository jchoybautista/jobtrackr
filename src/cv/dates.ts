const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatMonthYear(iso?: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})/);
  if (!m) return "";
  const month = MONTHS[parseInt(m[2], 10) - 1];
  return month ? `${month} ${m[1]}` : "";
}

export function formatRange(start?: string, end?: string): string {
  const s = formatMonthYear(start);
  const e = formatMonthYear(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `${s} – Present`;
  return e;
}
