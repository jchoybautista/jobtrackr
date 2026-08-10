import type {
  Application, Filters, Interview, Reminder, Snapshot, Stage,
} from "./types";

const DAY = 86_400_000;

export function computeNudges(
  apps: Application[], stages: Stage[], nudgeDays: number, nowIso: string,
): Map<string, number> {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const now = Date.parse(nowIso);
  const out = new Map<string, number>();
  for (const a of apps) {
    const stage = byId.get(a.stageId);
    if (!stage || stage.kind !== "pipeline" || stage.order === 0 || a.archived) continue;
    const days = Math.floor((now - Date.parse(a.updatedAt)) / DAY);
    if (days >= nudgeDays) out.set(a.id, days);
  }
  return out;
}

export function dueReminders(reminders: Reminder[], nowIso: string): Reminder[] {
  const now = Date.parse(nowIso);
  return reminders
    .filter((r) => !r.done && Date.parse(r.snoozedUntil ?? r.dueAt) <= now)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export function upcomingInterviews(interviews: Interview[], nowIso: string): Interview[] {
  const now = Date.parse(nowIso);
  return interviews
    .filter((i) => Date.parse(i.scheduledAt) >= now)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}

export function filterApplications(apps: Application[], f: Filters): Application[] {
  const q = f.search.trim().toLowerCase();
  return apps.filter((a) => {
    if (q && !a.company.toLowerCase().includes(q) && !a.role.toLowerCase().includes(q)) return false;
    if (f.tagIds.length && !f.tagIds.some((t) => a.tagIds.includes(t))) return false;
    if (f.sources.length && !(a.source && f.sources.includes(a.source))) return false;
    const hasSalary = a.salaryMin != null || a.salaryMax != null;
    if (f.hasSalary === true && !hasSalary) return false;
    if (f.hasSalary === false && hasSalary) return false;
    return true;
  });
}

export interface Metrics {
  total: number; active: number; offers: number; applied: number;
  responseRate: number; interviewRate: number;
  weekly: { label: string; count: number }[];
  funnel: { label: string; count: number; pct: number }[];
}

// Monday 00:00 UTC of the week containing `date`.
function mondayUtc(date: Date): number {
  const dow = date.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dow + 6) % 7;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysSinceMonday,
  );
}

export function computeMetrics(snap: Snapshot, nowIso: string): Metrics {
  const stageById = new Map(snap.stages.map((s) => [s.id, s]));
  const withInterview = new Set(snap.interviews.map((i) => i.applicationId));
  const apps = snap.applications;

  const stageOf = (a: Application) => stageById.get(a.stageId);
  const active = apps.filter((a) => stageOf(a)?.kind === "pipeline");
  const offers = apps.filter((a) => stageOf(a)?.kind === "won");
  const appliedApps = apps.filter((a) => {
    const s = stageOf(a);
    return s && (s.kind !== "pipeline" || s.order > 0);
  });
  const responded = appliedApps.filter((a) => {
    const s = stageOf(a)!;
    return withInterview.has(a.id) || s.kind === "won" || s.kind === "lost";
  });
  const interviewed = appliedApps.filter((a) => withInterview.has(a.id));

  // Last 8 UTC weeks (Monday week-start), oldest first.
  const thisMonday = mondayUtc(new Date(nowIso));
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const weekStart = thisMonday - (7 - i) * 7 * DAY;
    const weekEnd = weekStart + 7 * DAY;
    const count = apps.filter((a) => {
      const t = Date.parse(a.appliedAt ?? a.createdAt);
      return t >= weekStart && t < weekEnd;
    }).length;
    return {
      label: new Date(weekStart).toLocaleDateString("en-US", {
        month: "short", day: "numeric", timeZone: "UTC",
      }),
      count,
    };
  });

  const applied = appliedApps.length;
  const pct = (n: number) => (applied === 0 ? 0 : Math.round((n / applied) * 100));
  return {
    total: apps.length,
    active: active.length,
    offers: offers.length,
    applied,
    responseRate: applied === 0 ? 0 : responded.length / applied,
    interviewRate: applied === 0 ? 0 : interviewed.length / applied,
    weekly,
    funnel: [
      { label: "Applied", count: applied, pct: pct(applied) },
      { label: "Interviewed", count: interviewed.length, pct: pct(interviewed.length) },
      { label: "Offer", count: offers.length, pct: pct(offers.length) },
    ],
  };
}
