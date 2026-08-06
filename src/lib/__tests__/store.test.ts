import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll } from "@/lib/repo";
import { useApp } from "@/lib/store";

beforeEach(async () => {
  await clearAll();
  useApp.setState({ ready: false });
});

describe("store", () => {
  it("hydrate seeds and loads a snapshot", async () => {
    await useApp.getState().hydrate();
    const s = useApp.getState();
    expect(s.ready).toBe(true);
    expect(s.stages.length).toBe(7);
    expect(s.applications.length).toBeGreaterThan(0);
  });

  it("every seeded application references an existing stage", async () => {
    await useApp.getState().hydrate();
    const s = useApp.getState();
    const stageIds = new Set(s.stages.map((st) => st.id));
    expect(s.applications.length).toBeGreaterThan(0);
    for (const a of s.applications) {
      expect(stageIds.has(a.stageId)).toBe(true);
    }
  });

  it("addApplication appends to the first stage and logs an event", async () => {
    await useApp.getState().hydrate();
    const app = await useApp.getState().addApplication({ company: "Acme", role: "Dev" });
    const s = useApp.getState();
    expect(s.applications.find((a) => a.id === app.id)).toBeTruthy();
    expect(app.stageId).toBe(s.stages[0].id);
    expect(s.events.some((e) => e.applicationId === app.id && e.kind === "created")).toBe(true);
  });

  it("moveApplication persists the move and reports won", async () => {
    await useApp.getState().hydrate();
    const app = await useApp.getState().addApplication({ company: "Acme", role: "Dev" });
    const offer = useApp.getState().stages.find((st) => st.kind === "won")!;
    const { won } = await useApp.getState().moveApplication(app.id, offer.id, 0);
    expect(won).toBe(true);
    expect(useApp.getState().applications.find((a) => a.id === app.id)!.stageId).toBe(offer.id);
  });

  it("removeStage refuses to delete a pinned stage", async () => {
    await useApp.getState().hydrate();
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
});
