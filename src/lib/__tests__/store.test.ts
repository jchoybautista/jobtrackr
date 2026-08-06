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

  it("removeStage refuses when the stage has cards", async () => {
    await useApp.getState().hydrate();
    const s = useApp.getState();
    const stageWithCards = s.stages.find((st) =>
      s.applications.some((a) => a.stageId === st.id))!;
    expect(await s.removeStage(stageWithCards.id)).toBe(false);
  });
});
