import type {
  Application, Filters, Interview, Reminder, Snapshot, Stage,
} from "./types";
import { furthestOrderOf, orderOfRole, stageByRole } from "./furthest";
import type { StageRole } from "./types";

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
  responseRate: number;
  interviewPassRate: number | null;
  technicalPassRate: number | null;
  screeningCount: number;
  rejectedCount: number;
  ghostedCount: number;
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
  const stages = snap.stages;
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const apps = snap.applications;
  const now = Date.parse(nowIso);
  const ghostDays = snap.settings.ghostDays ?? 14;

  const stageOf = (a: Application) => stageById.get(a.stageId);
  const active = apps.filter((a) => stageOf(a)?.kind === "pipeline");
  const offers = apps.filter((a) => stageOf(a)?.kind === "won");
  const appliedApps = apps.filter((a) => {
    const s = stageOf(a);
    return s && (s.kind !== "pipeline" || s.order > 0);
  });

  const reached = (a: Application, role: StageRole) => {
    const ro = orderOfRole(stages, role);
    return ro != null && furthestOrderOf(a, stages) >= ro;
  };
  const passed = (a: Application, role: StageRole) => {
    const ro = orderOfRole(stages, role);
    if (ro == null) return false;
    return furthestOrderOf(a, stages) > ro || stageOf(a)?.kind === "won";
  };
  const rate = (role: StageRole): number | null => {
    const denom = apps.filter((a) => reached(a, role)).length;
    if (denom === 0) return null;
    return apps.filter((a) => passed(a, role)).length / denom;
  };

  const responded = appliedApps.filter((a) => {
    const k = stageOf(a)?.kind;
    return reached(a, "screening") || k === "won" || k === "lost";
  });

  const ghostedCount = apps.filter((a) => {
    const s = stageOf(a);
    if (!s || s.kind !== "pipeline" || s.role === "saved") return false;
    return (now - Date.parse(a.updatedAt)) / DAY >= ghostDays;
  }).length;

  const screeningStage = stageByRole(stages, "screening");
  const screeningCount = screeningStage
    ? apps.filter((a) => a.stageId === screeningStage.id).length : 0;
  const rejectedCount = apps.filter((a) => stageOf(a)?.kind === "lost").length;

  const applied = appliedApps.length;
  const pct = (n: number) => (applied === 0 ? 0 : Math.round((n / applied) * 100));
  const reachedCount = (role: StageRole) => apps.filter((a) => reached(a, role)).length;

  const funnelRoles: { role: StageRole; label: string; count: number }[] = [
    { role: "screening", label: "Screening", count: reachedCount("screening") },
    { role: "interview", label: "Interview", count: reachedCount("interview") },
    { role: "technical", label: "Technical", count: reachedCount("technical") },
    { role: "final", label: "Final", count: reachedCount("final") },
  ];
  const funnel = [
    { label: "Applied", count: applied, pct: 100 },
    ...funnelRoles
      .filter((r) => stageByRole(stages, r.role))
      .map((r) => ({ label: r.label, count: r.count, pct: pct(r.count) })),
    ...(stageByRole(stages, "offer") ? [{ label: "Offer", count: offers.length, pct: pct(offers.length) }] : []),
  ];

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

  return {
    total: apps.length,
    active: active.length,
    offers: offers.length,
    applied,
    responseRate: applied === 0 ? 0 : responded.length / applied,
    interviewPassRate: rate("interview"),
    technicalPassRate: rate("technical"),
    screeningCount,
    rejectedCount,
    ghostedCount,
    weekly,
    funnel,
  };
}
