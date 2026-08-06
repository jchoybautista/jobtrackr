import { describe, it, expect } from "vitest";
import { reorderStagesPinned, reassignStageCards } from "@/lib/ordering";
import type { Application, Stage } from "@/lib/types";

const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "a", name: "A", color: "sky", order: 1, kind: "pipeline" },
  { id: "b", name: "B", color: "yellow", order: 2, kind: "pipeline" },
  { id: "rejected", name: "Rejected", color: "gray", order: 3, kind: "lost", role: "rejected" },
  { id: "offer", name: "Offer", color: "mint", order: 4, kind: "won", role: "offer", pinned: true },
];

describe("reorderStagesPinned", () => {
  it("keeps a pinned stage from moving", () => {
    expect(reorderStagesPinned(stages, "saved", 3)).toEqual(stages);
  });
  it("clamps a move past the pinned-last stage", () => {
    const out = reorderStagesPinned(stages, "a", 4); // try to drop after Offer
    expect(out[out.length - 1].id).toBe("offer"); // Offer still last
    expect(out.map((s) => s.order)).toEqual([0, 1, 2, 3, 4]);
    expect(out.find((s) => s.id === "a")!.order).toBe(3); // just before rejected
  });
  it("clamps a move before the pinned-first stage", () => {
    const out = reorderStagesPinned(stages, "b", 0);
    expect(out[0].id).toBe("saved"); // Saved still first
    expect(out.find((s) => s.id === "b")!.order).toBe(1);
  });
});

describe("reassignStageCards", () => {
  const apps: Application[] = [
    { id: "x", company: "c", role: "r", tagIds: [], stageId: "a", order: 0, createdAt: "t", updatedAt: "t" },
    { id: "y", company: "c", role: "r", tagIds: [], stageId: "b", order: 0, createdAt: "t", updatedAt: "t" },
  ];
  it("moves cards from one stage to another", () => {
    const out = reassignStageCards(apps, "a", "b");
    expect(out.find((a) => a.id === "x")!.stageId).toBe("b");
    expect(out.find((a) => a.id === "y")!.stageId).toBe("b");
  });
});
