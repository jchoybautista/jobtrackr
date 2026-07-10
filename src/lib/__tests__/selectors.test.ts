import { describe, it, expect } from "vitest";
import { computeNudges, dueReminders, filterApplications, computeMetrics } from "@/lib/selectors";
import { formatSalary, relativeDays } from "@/lib/format";
import type { Application, Snapshot, Stage } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/repo";

const NOW = "2026-07-06T12:00:00.000Z";
const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline" },
  { id: "applied", name: "Applied", color: "pink", order: 1, kind: "pipeline" },
  { id: "interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline" },
  { id: "offer", name: "Offer", color: "mint", order: 3, kind: "won" },
  { id: "rejected", name: "Rejected", color: "gray", order: 4, kind: "lost" },
];
const app = (id: string, stageId: string, o: Partial<Application> = {}): Application => ({
  id, company: id, role: "Engineer", tagIds: [], stageId, order: 0,
  createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-06-20T00:00:00.000Z", ...o,
});

describe("computeNudges", () => {
  it("nudges silent apps past threshold, skips Saved and terminal stages", () => {
    const apps = [
      app("quiet", "applied"),                                   // 16 days silent
      app("fresh", "applied", { updatedAt: "2026-07-05T12:00:00.000Z" }),
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
    app("a", "applied", { company: "Stripe", role: "Designer", tagIds: ["tag-dream"], salaryMin: 120000 }),
    app("b", "applied", { company: "Linear", role: "Engineer", source: "Referral" }),
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
  it("computes rates from stages and interviews", () => {
    const snap: Snapshot = {
      stages,
      applications: [
        app("s1", "saved"), app("a1", "applied"), app("a2", "applied"),
        app("i1", "interview"), app("o1", "offer"), app("r1", "rejected"),
      ],
      tags: [], contacts: [], events: [], notes: [], reminders: [],
      interviews: [{ id: "iv", applicationId: "i1", roundType: "phone", scheduledAt: NOW }],
      settings: DEFAULT_SETTINGS,
    };
    const m = computeMetrics(snap, NOW);
    expect(m.total).toBe(6);
    expect(m.active).toBe(4);      // saved, a1, a2, i1
    expect(m.offers).toBe(1);
    expect(m.applied).toBe(5);     // all but "s1"
    expect(m.responseRate).toBeCloseTo(3 / 5); // i1 (interview) + o1 + r1
    expect(m.interviewRate).toBeCloseTo(1 / 5);
    expect(m.funnel[0]).toEqual({ label: "Applied", count: 5, pct: 100 });
  });
});

describe("format", () => {
  it("formats salary ranges compactly", () => {
    expect(formatSalary(app("x", "applied", { salaryMin: 120000, salaryMax: 140000, currency: "USD" }))).toBe("$120k–140k");
    expect(formatSalary(app("y", "applied", { salaryMin: 135000, currency: "USD" }))).toBe("$135k");
    expect(formatSalary(app("z", "applied"))).toBeNull();
  });
  it("renders relative days", () => {
    expect(relativeDays("2026-07-06T09:00:00.000Z", NOW)).toBe("today");
    expect(relativeDays("2026-06-28T12:00:00.000Z", NOW)).toBe("8d ago");
    expect(relativeDays("2026-07-09T12:00:00.000Z", NOW)).toBe("in 3d");
  });
});
