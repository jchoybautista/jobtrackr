import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  loadAll, putStage, putApplication, putInterview, deleteApplication,
  clearAll, importSnapshot, DEFAULT_SETTINGS,
} from "@/lib/repo";
import type { Application, Snapshot, Stage } from "@/lib/types";

const stage = (o: Partial<Stage> = {}): Stage =>
  ({ id: "s1", name: "Applied", color: "pink", order: 0, kind: "pipeline", ...o });

const app = (o: Partial<Application> = {}): Application => ({
  id: "a1", company: "Stripe", role: "Designer", tagIds: [], stageId: "s1",
  order: 0, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z", ...o,
});

beforeEach(async () => { await clearAll(); });

describe("repo", () => {
  it("loadAll returns empty snapshot with default settings on fresh db", async () => {
    const snap = await loadAll();
    expect(snap.applications).toEqual([]);
    expect(snap.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips entities and sorts stages/applications by order", async () => {
    await putStage(stage({ id: "s2", order: 1, name: "Interview" }));
    await putStage(stage());
    await putApplication(app({ id: "a2", order: 1 }));
    await putApplication(app());
    const snap = await loadAll();
    expect(snap.stages.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(snap.applications.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("deleteApplication cascades to child records", async () => {
    await putApplication(app());
    await putInterview({ id: "i1", applicationId: "a1", roundType: "phone", scheduledAt: "2026-07-08T10:00:00.000Z" });
    await deleteApplication("a1");
    const snap = await loadAll();
    expect(snap.interviews).toEqual([]);
  });

  it("importSnapshot replace mode swaps all data", async () => {
    await putApplication(app());
    const incoming: Snapshot = {
      stages: [stage({ id: "sx" })], applications: [app({ id: "ax", stageId: "sx" })],
      tags: [], interviews: [], contacts: [], events: [], notes: [], reminders: [],
      settings: { ...DEFAULT_SETTINGS, nudgeDays: 10 },
    };
    await importSnapshot(incoming, "replace");
    const snap = await loadAll();
    expect(snap.applications.map((a) => a.id)).toEqual(["ax"]);
    expect(snap.settings.nudgeDays).toBe(10);
  });
});
