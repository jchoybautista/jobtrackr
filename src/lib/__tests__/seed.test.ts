import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, loadAll, putProfile, DEFAULT_SETTINGS } from "@/lib/repo";
import {
  seedIfEmpty, clearDemoData, demoSnapshot, DEFAULT_STAGES, PRESET_TAGS,
} from "@/lib/seed";
import { computeMetrics, dueReminders, upcomingInterviews } from "@/lib/selectors";

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
    expect(snap.contacts).toEqual([]);
    expect(snap.notes).toEqual([]);
    expect(snap.events).toEqual([]);
    // including the standalone reminder that no application deletion would catch
    expect(snap.reminders).toEqual([]);
    expect(snap.stages).toHaveLength(DEFAULT_STAGES.length);
    expect(snap.tags).toHaveLength(PRESET_TAGS.length);
    expect(snap.settings.demo).toBe(false);
  });

  it("clearDemoData also clears the demo CV library and master profile", async () => {
    await seedIfEmpty();
    await clearDemoData();
    const snap = await loadAll();
    expect(snap.cvdocs).toEqual([]);
    expect(snap.profile).toBeNull();
  });

  it("clearDemoData keeps a profile the user has made their own", async () => {
    await seedIfEmpty();
    const seeded = await loadAll();
    await putProfile({
      ...seeded.profile!,
      content: { ...seeded.profile!.content, fullName: "Real Person" },
    });
    await clearDemoData();
    const snap = await loadAll();
    expect(snap.profile?.content.fullName).toBe("Real Person");
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

  it("cross-references (interviews, contacts, reminders, events, cvs) point at real demo apps", () => {
    const snap = demoSnapshot(NOW);
    const appIds = new Set(snap.applications.map((a) => a.id));
    for (const i of snap.interviews) expect(appIds.has(i.applicationId)).toBe(true);
    for (const c of snap.contacts) expect(appIds.has(c.applicationId)).toBe(true);
    for (const n of snap.notes) expect(appIds.has(n.applicationId)).toBe(true);
    for (const r of snap.reminders) {
      if (r.applicationId) expect(appIds.has(r.applicationId)).toBe(true);
    }
    for (const e of snap.events) expect(appIds.has(e.applicationId)).toBe(true);
    for (const c of snap.cvdocs) {
      if (c.applicationId) expect(appIds.has(c.applicationId)).toBe(true);
    }
  });

  it("gives every id a demo- prefix so clearing demo data catches all of it", () => {
    const snap = demoSnapshot(NOW);
    const rows = [
      ...snap.applications, ...snap.interviews, ...snap.contacts,
      ...snap.notes, ...snap.events, ...snap.reminders, ...snap.cvdocs,
    ];
    for (const r of rows) expect(r.id.startsWith("demo-")).toBe(true);
  });

  it("stocks every stage, with timelines that stay in order", () => {
    const snap = demoSnapshot(NOW);
    // Deliberately varied per stage (2–5, capped well under a board that
    // bombards any single column) rather than a uniform count everywhere.
    for (const stage of DEFAULT_STAGES) {
      const count = snap.applications.filter((a) => a.stageId === stage.id).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(7);
    }
    for (const a of snap.applications) {
      expect(Date.parse(a.createdAt)).toBeLessThanOrEqual(Date.parse(a.updatedAt));
      if (a.appliedAt) {
        expect(Date.parse(a.createdAt)).toBeLessThanOrEqual(Date.parse(a.appliedAt));
        expect(Date.parse(a.appliedAt)).toBeLessThanOrEqual(Date.parse(a.updatedAt));
      }
    }
  });

  it("fills the dashboard: salaries, both reminder states, and past + future interviews", () => {
    const snap = demoSnapshot(NOW);
    const nowIso = NOW.toISOString();
    expect(snap.applications.filter((a) => a.salaryMin != null || a.salaryMax != null).length)
      .toBeGreaterThanOrEqual(5);
    expect(dueReminders(snap.reminders, nowIso).length).toBeGreaterThanOrEqual(2);
    expect(upcomingInterviews(snap.interviews, nowIso).length).toBeGreaterThanOrEqual(5);
    expect(snap.interviews.length).toBeGreaterThan(upcomingInterviews(snap.interviews, nowIso).length);
    const weekly = computeMetrics(
      { ...snap, settings: { ...DEFAULT_SETTINGS, ghostDays: 14 } }, nowIso,
    ).weekly;
    expect(weekly.filter((w) => w.count > 0).length).toBeGreaterThanOrEqual(6);
  });

  it("ships a master profile and a CV library built from it", () => {
    const snap = demoSnapshot(NOW);
    expect(snap.profile?.content.fullName).toBeTruthy();
    expect(snap.profile?.content.experience.length).toBeGreaterThanOrEqual(3);
    expect(snap.cvdocs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(snap.cvdocs.map((c) => c.templateId)).size).toBeGreaterThan(1);
    for (const c of snap.cvdocs) expect(c.content.fullName).toBe(snap.profile?.content.fullName);
  });
});
