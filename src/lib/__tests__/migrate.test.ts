import { describe, it, expect } from "vitest";
import { needsMigration, migrateSnapshot, backfillFurthest } from "@/lib/migrate";
import type { ActivityEvent, Application, Snapshot, Stage } from "@/lib/types";
import { DEFAULT_STAGES } from "@/lib/seed";

const legacyStages: Stage[] = [
  { id: "stage-saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline" },
  { id: "stage-applied", name: "Applied", color: "pink", order: 1, kind: "pipeline" },
  { id: "stage-interview", name: "Interview", color: "blush", order: 2, kind: "pipeline" },
  { id: "stage-offer", name: "Offer", color: "mint", order: 3, kind: "won" },
  { id: "stage-rejected", name: "Rejected", color: "gray", order: 4, kind: "lost" },
];
const legacySettings = { id: "singleton" as const, nudgeDays: 7, currency: "USD", theme: "light" as const, demo: false };
const app = (o: Partial<Application>): Application => ({
  id: "a", company: "c", role: "r", tagIds: [], stageId: "stage-saved", order: 0,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...o,
});
const snap = (o: Partial<Snapshot> = {}): Snapshot => ({
  stages: legacyStages, applications: [], tags: [], interviews: [], contacts: [],
  events: [], notes: [], reminders: [], settings: legacySettings as Snapshot["settings"],
  profile: null, cvdocs: [], ...o,
});

describe("needsMigration", () => {
  it("true when no stage has a role", () => {
    expect(needsMigration(snap())).toBe(true);
  });
  it("false once stages are role-anchored and ghostDays is set", () => {
    expect(needsMigration(snap({
      stages: DEFAULT_STAGES,
      settings: { ...legacySettings, ghostDays: 14 } as Snapshot["settings"],
    }))).toBe(false);
  });
});

describe("migrateSnapshot", () => {
  it("stamps roles, keeps legacy Applied as custom before Rejected, pins ends", () => {
    const m = migrateSnapshot(snap());
    // Saved first pinned, Offer last pinned
    expect(m.stages[0]).toMatchObject({ id: "stage-saved", role: "saved", pinned: true, order: 0 });
    expect(m.stages[m.stages.length - 1]).toMatchObject({ id: "stage-offer", role: "offer", pinned: true });
    // all 7 default roles present
    expect(new Set(m.stages.map((s) => s.role))).toEqual(
      new Set(["saved", "screening", "interview", "technical", "final", "rejected", "offer", undefined]),
    );
    // legacy Applied preserved, roleless, immediately before Rejected
    const applied = m.stages.find((s) => s.id === "stage-applied")!;
    const rejected = m.stages.find((s) => s.role === "rejected")!;
    expect(applied.role).toBeUndefined();
    expect(applied.order).toBe(rejected.order - 1);
    // existing color preserved for a matched default
    expect(m.stages.find((s) => s.id === "stage-interview")!.color).toBe("blush");
    // orders are contiguous
    expect(m.stages.map((s) => s.order)).toEqual(m.stages.map((_, i) => i));
    expect(m.settings.ghostDays).toBe(14);
  });

  it("is idempotent", () => {
    const once = migrateSnapshot(snap());
    const twice = migrateSnapshot(once);
    expect(twice.stages).toEqual(once.stages);
  });
});

describe("backfillFurthest", () => {
  const migrated = migrateSnapshot(snap()).stages;
  it("recovers the deepest pipeline stage from stage_move events for a rejected app", () => {
    const events: ActivityEvent[] = [
      { id: "e1", applicationId: "a", kind: "stage_move", message: "Moved to Screening", at: "x" },
      { id: "e2", applicationId: "a", kind: "stage_move", message: "Moved to Technical", at: "y" },
      { id: "e3", applicationId: "a", kind: "stage_move", message: "Moved to Rejected", at: "z" },
    ];
    const id = backfillFurthest(app({ stageId: "stage-rejected" }), events, migrated);
    expect(migrated.find((s) => s.id === id)!.role).toBe("technical");
  });
  it("uses current pipeline stage when there is no history", () => {
    const id = backfillFurthest(app({ stageId: "stage-interview" }), [], migrated);
    expect(migrated.find((s) => s.id === id)!.role).toBe("interview");
  });
});
