import { describe, it, expect } from "vitest";
import { computeNudges, dueReminders, filterApplications, computeMetrics } from "@/lib/selectors";
import { formatSalary, relativeDays } from "@/lib/format";
import type { Application, Snapshot, Stage } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/repo";

const NOW = "2026-07-06T12:00:00.000Z";
const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "screening", name: "Screening", color: "sky", order: 1, kind: "pipeline", role: "screening" },
  { id: "interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline", role: "interview" },
  { id: "technical", name: "Technical", color: "peach", order: 3, kind: "pipeline", role: "technical" },
  { id: "final", name: "Final interview", color: "orchid", order: 4, kind: "pipeline", role: "final" },
  { id: "rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
  { id: "offer", name: "Offer", color: "mint", order: 6, kind: "won", role: "offer", pinned: true },
];
const app = (id: string, stageId: string, o: Partial<Application> = {}): Application => ({
  id, company: id, role: "Engineer", tagIds: [], stageId, order: 0,
  createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-06-20T00:00:00.000Z", ...o,
});

describe("computeNudges", () => {
  it("nudges silent apps past threshold, skips Saved and terminal stages", () => {
    const apps = [
      app("quiet", "screening"),                                   // 16 days silent
      app("fresh", "screening", { updatedAt: "2026-07-05T12:00:00.000Z" }),
      app("saved", "saved"),
      app("done", "rejected"),
    ];
    const nudges = computeNudges(apps, stages, 7, NOW);
    expect(nudges.get("quiet")).toBe(16);
    expect(nudges.has("fresh")).toBe(false);
    expect(nudges.has("saved")).toBe(false);
    expect(nudges.has("done")).toBe(false);
  });
});

describe("dueReminders", () => {
  it("returns undone due reminders, respecting snooze", () => {
    const rs = [
      { id: "r1", type: "follow_up" as const, title: "a", dueAt: "2026-07-05T00:00:00.000Z", done: false },
      { id: "r2", type: "follow_up" as const, title: "b", dueAt: "2026-07-05T00:00:00.000Z", done: false, snoozedUntil: "2026-07-09T00:00:00.000Z" },
      { id: "r3", type: "follow_up" as const, title: "c", dueAt: "2026-07-01T00:00:00.000Z", done: true },
    ];
    expect(dueReminders(rs, NOW).map((r) => r.id)).toEqual(["r1"]);
  });
});

describe("filterApplications", () => {
  const apps = [
    app("a", "screening", { company: "Stripe", role: "Designer", tagIds: ["tag-dream"], salaryMin: 120000 }),
    app("b", "screening", { company: "Linear", role: "Engineer", source: "Referral" }),
  ];
  it("matches search on company or role, case-insensitive", () => {
    expect(filterApplications(apps, { search: "stri", tagIds: [], sources: [], hasSalary: null })).toHaveLength(1);
    expect(filterApplications(apps, { search: "engineer", tagIds: [], sources: [], hasSalary: null })[0].id).toBe("b");
  });
  it("filters by tag, source, salary presence", () => {
    expect(filterApplications(apps, { search: "", tagIds: ["tag-dream"], sources: [], hasSalary: null })[0].id).toBe("a");
    expect(filterApplications(apps, { search: "", tagIds: [], sources: ["Referral"], hasSalary: null })[0].id).toBe("b");
    expect(filterApplications(apps, { search: "", tagIds: [], sources: [], hasSalary: true })[0].id).toBe("a");
  });
});

describe("computeMetrics", () => {
  const withFurthest = (id: string, stageId: string, furthestStageId?: string, o: Partial<Application> = {}) =>
    app(id, stageId, { furthestStageId: furthestStageId ?? stageId, ...o });

  it("computes passing rates from furthest reached", () => {
    const snap: Snapshot = {
      stages,
      applications: [
        withFurthest("saved1", "saved"),
        withFurthest("scr1", "screening"),
        withFurthest("int1", "interview"),
        withFurthest("tech1", "technical"),
        // rejected after reaching technical → counts against technical + interview denominators
        withFurthest("rejTech", "rejected", "technical"),
        withFurthest("offer1", "offer", "final"),
      ],
      tags: [], contacts: [], events: [], notes: [], reminders: [],
      interviews: [],
      settings: { ...DEFAULT_SETTINGS, ghostDays: 14 },
      profile: null, cvdocs: [],
    };
    const m = computeMetrics(snap, NOW);
    expect(m.applied).toBe(5); // all but saved1
    expect(m.offers).toBe(1);
    // reached interview: int1, tech1, rejTech, offer1 = 4; passed interview: tech1, rejTech, offer1 = 3
    expect(m.interviewPassRate).toBeCloseTo(3 / 4);
    // reached technical: tech1, rejTech, offer1 = 3; passed technical: offer1 = 1
    expect(m.technicalPassRate).toBeCloseTo(1 / 3);
    expect(m.funnel[0]).toEqual({ label: "Applied", count: 5, pct: 100 });
    expect(m.funnel.find((f) => f.label === "Offer")).toEqual({ label: "Offer", count: 1, pct: 20 });
  });

  it("returns null pass rate when nobody reached the stage", () => {
    const snap: Snapshot = {
      stages, applications: [app("s", "saved", { furthestStageId: "saved" })],
      tags: [], contacts: [], events: [], notes: [], reminders: [], interviews: [],
      settings: { ...DEFAULT_SETTINGS, ghostDays: 14 }, profile: null, cvdocs: [],
    };
    expect(computeMetrics(snap, NOW).technicalPassRate).toBeNull();
  });

  it("counts ghosted apps past Saved and silent beyond ghostDays", () => {
    const snap: Snapshot = {
      stages,
      applications: [
        app("ghost", "screening", { furthestStageId: "screening", updatedAt: "2026-06-01T00:00:00.000Z" }),
        app("fresh", "screening", { furthestStageId: "screening", updatedAt: NOW }),
        app("savedGhost", "saved", { furthestStageId: "saved", updatedAt: "2026-06-01T00:00:00.000Z" }),
      ],
      tags: [], contacts: [], events: [], notes: [], reminders: [], interviews: [],
      settings: { ...DEFAULT_SETTINGS, ghostDays: 14 }, profile: null, cvdocs: [],
    };
    const m = computeMetrics(snap, NOW);
    expect(m.ghostedCount).toBe(1); // only "ghost"
    expect(m.screeningCount).toBe(2); // ghost + fresh currently in screening
  });
});

describe("format", () => {
  it("formats salary ranges compactly", () => {
    expect(formatSalary(app("x", "screening", { salaryMin: 120000, salaryMax: 140000, currency: "USD" }))).toBe("$120k–140k");
    expect(formatSalary(app("y", "screening", { salaryMin: 135000, currency: "USD" }))).toBe("$135k");
    expect(formatSalary(app("z", "screening"))).toBeNull();
  });
  it("renders relative days", () => {
    expect(relativeDays("2026-07-06T09:00:00.000Z", NOW)).toBe("today");
    expect(relativeDays("2026-06-28T12:00:00.000Z", NOW)).toBe("8d ago");
    expect(relativeDays("2026-07-09T12:00:00.000Z", NOW)).toBe("in 3d");
  });
});
