import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, loadAll, DEFAULT_SETTINGS } from "@/lib/repo";
import {
  seedIfEmpty, clearDemoData, demoSnapshot, DEFAULT_STAGES, PRESET_TAGS,
} from "@/lib/seed";
import { computeMetrics } from "@/lib/selectors";

beforeEach(async () => { await clearAll(); });

describe("seed", () => {
  it("seeds a fresh db with stages, preset tags, and demo apps", async () => {
    const seeded = await seedIfEmpty();
    expect(seeded).toBe(true);
    const snap = await loadAll();
    expect(snap.stages).toHaveLength(DEFAULT_STAGES.length);
    expect(snap.tags).toHaveLength(PRESET_TAGS.length);
    expect(snap.applications.length).toBeGreaterThanOrEqual(5);
    expect(snap.settings.demo).toBe(true);
  });

  it("is idempotent — second call does nothing", async () => {
    await seedIfEmpty();
    const seeded = await seedIfEmpty();
    expect(seeded).toBe(false);
  });

  it("clearDemoData removes demo apps and their children but keeps stages", async () => {
    await seedIfEmpty();
    await clearDemoData();
    const snap = await loadAll();
    expect(snap.applications).toEqual([]);
    expect(snap.interviews).toEqual([]);
    expect(snap.stages).toHaveLength(DEFAULT_STAGES.length);
    expect(snap.settings.demo).toBe(false);
  });
});

describe("demo data", () => {
  const NOW = new Date("2026-08-07T12:00:00.000Z");

  it("spans the new stages and yields meaningful analytics", () => {
    const snap = demoSnapshot(NOW);
    const roles = new Set(snap.applications.map((a) => {
      return DEFAULT_STAGES.find((s) => s.id === a.stageId)?.role;
    }));
    expect(roles.has("screening")).toBe(true);
    expect(roles.has("technical")).toBe(true);
    expect(roles.has("final")).toBe(true);

    const m = computeMetrics(
      { ...snap, settings: { ...DEFAULT_SETTINGS, ghostDays: 14 } },
      NOW.toISOString(),
    );
    expect(m.ghostedCount).toBeGreaterThanOrEqual(1);
    expect(m.interviewPassRate).not.toBeNull();
    expect(m.technicalPassRate).not.toBeNull();
  });

  it("keeps every application stageId within DEFAULT_STAGES", () => {
    const snap = demoSnapshot(NOW);
    const ids = new Set(DEFAULT_STAGES.map((s) => s.id));
    for (const a of snap.applications) {
      expect(ids.has(a.stageId)).toBe(true);
    }
  });

  it("keeps stage-saved populated", () => {
    const snap = demoSnapshot(NOW);
    expect(snap.applications.filter((a) => a.stageId === "stage-saved").length)
      .toBeGreaterThanOrEqual(2);
  });

  it("cross-references (interviews, contacts, reminders, events) point at real demo apps", () => {
    const snap = demoSnapshot(NOW);
    const appIds = new Set(snap.applications.map((a) => a.id));
    for (const i of snap.interviews) expect(appIds.has(i.applicationId)).toBe(true);
    for (const c of snap.contacts) expect(appIds.has(c.applicationId)).toBe(true);
    for (const r of snap.reminders) {
      if (r.applicationId) expect(appIds.has(r.applicationId)).toBe(true);
    }
    for (const e of snap.events) expect(appIds.has(e.applicationId)).toBe(true);
  });
});
