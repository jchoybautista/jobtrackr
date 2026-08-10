import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll } from "@/lib/repo";
import { useApp } from "@/lib/store";
import { toJson } from "@/lib/exportio";
import type { Snapshot } from "@/lib/types";

beforeEach(async () => {
  await clearAll();
  useApp.setState({ ready: false });
});

describe("store", () => {
  it("hydrate seeds and loads a snapshot", async () => {
    await useApp.getState().hydrate({ kind: "demo" });
    const s = useApp.getState();
    expect(s.ready).toBe(true);
    expect(s.stages.length).toBe(7);
    expect(s.applications.length).toBeGreaterThan(0);
  });

  it("every seeded application references an existing stage", async () => {
    await useApp.getState().hydrate({ kind: "demo" });
    const s = useApp.getState();
    const stageIds = new Set(s.stages.map((st) => st.id));
    expect(s.applications.length).toBeGreaterThan(0);
    for (const a of s.applications) {
      expect(stageIds.has(a.stageId)).toBe(true);
    }
  });

  it("addApplication appends to the first stage and logs an event", async () => {
    await useApp.getState().hydrate({ kind: "demo" });
    const app = await useApp.getState().addApplication({ company: "Acme", role: "Dev" });
    const s = useApp.getState();
    expect(s.applications.find((a) => a.id === app.id)).toBeTruthy();
    expect(app.stageId).toBe(s.stages[0].id);
    expect(s.events.some((e) => e.applicationId === app.id && e.kind === "created")).toBe(true);
  });

  it("moveApplication persists the move and reports won", async () => {
    await useApp.getState().hydrate({ kind: "demo" });
    const app = await useApp.getState().addApplication({ company: "Acme", role: "Dev" });
    const offer = useApp.getState().stages.find((st) => st.kind === "won")!;
    const { won } = await useApp.getState().moveApplication(app.id, offer.id, 0);
    expect(won).toBe(true);
    expect(useApp.getState().applications.find((a) => a.id === app.id)!.stageId).toBe(offer.id);
  });

  it("removeStage refuses to delete a pinned stage", async () => {
    await useApp.getState().hydrate({ kind: "demo" });
    const s = useApp.getState();
    const saved = s.stages.find((st) => st.id === "stage-saved")!;
    expect(saved.pinned).toBe(true);
    expect(await s.removeStage(saved.id)).toBe(false);
    expect(useApp.getState().stages.some((st) => st.id === "stage-saved")).toBe(true);
  });

  it("removeStage moves a non-pinned stage's cards to the previous stage and reindexes", async () => {
    const stages = [
      { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
      { id: "mid", name: "Mid", color: "sky", order: 1, kind: "pipeline" },
      { id: "offer", name: "Offer", color: "mint", order: 2, kind: "won", role: "offer", pinned: true },
    ];
    const apps = [
      { id: "s1", company: "S", role: "r", tagIds: [], stageId: "saved", order: 0, createdAt: "t", updatedAt: "t" },
      { id: "m1", company: "M", role: "r", tagIds: [], stageId: "mid", order: 0, createdAt: "t", updatedAt: "t" },
      { id: "m2", company: "M2", role: "r", tagIds: [], stageId: "mid", order: 1, createdAt: "t", updatedAt: "t" },
    ];
    useApp.setState({ stages, applications: apps } as never);
    const ok = await useApp.getState().removeStage("mid");
    expect(ok).toBe(true);
    const s = useApp.getState();
    expect(s.stages.some((st) => st.id === "mid")).toBe(false);
    expect(s.stages.map((st) => st.order)).toEqual(s.stages.map((_, i) => i)); // contiguous
    // m1/m2 moved to the previous stage (saved) with contiguous orders after s1
    const saved = s.applications.filter((a) => a.stageId === "saved").sort((a, b) => a.order - b.order);
    expect(saved.map((a) => a.id)).toEqual(["s1", "m1", "m2"]);
    expect(saved.map((a) => a.order)).toEqual([0, 1, 2]);
  });

  it("importData migrates a legacy (pre-role, pre-ghostDays) snapshot into the live store", async () => {
    // 5 roleless stages, as a pre-migration export would have.
    const legacyStages = [
      { id: "stage-saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline" },
      { id: "stage-applied", name: "Applied", color: "sky", order: 1, kind: "pipeline" },
      { id: "stage-interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline" },
      { id: "stage-offer", name: "Offer", color: "mint", order: 3, kind: "won" },
      { id: "stage-rejected", name: "Rejected", color: "gray", order: 4, kind: "lost" },
    ];
    const legacyApp = {
      id: "legacy-1", company: "Acme", role: "Dev", tagIds: [],
      stageId: "stage-interview", order: 0,
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const legacySnapshot = {
      stages: legacyStages,
      applications: [legacyApp],
      tags: [], interviews: [], contacts: [], events: [], notes: [], reminders: [],
      // No ghostDays — pre-ghosting export.
      settings: { id: "singleton", nudgeDays: 7, currency: "USD", theme: "light", demo: false },
      profile: null, cvdocs: [],
    } as unknown as Snapshot;

    const json = await toJson(legacySnapshot);
    await useApp.getState().importData(json, "replace");

    const s = useApp.getState();
    // Migration ran: roles got stamped onto the canonical stages.
    expect(s.stages.some((st) => st.role === "screening")).toBe(true);
    // The offer stage is pinned again.
    expect(s.stages.find((st) => st.id === "stage-offer")?.pinned).toBe(true);
    // Settings backfilled with the default ghostDays.
    expect(s.settings.ghostDays).toBe(14);
  });
});
