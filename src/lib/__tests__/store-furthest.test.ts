import { describe, it, expect } from "vitest";
import { applyFurthestOnMove } from "@/lib/furthest";
import type { Application, Stage } from "@/lib/types";

const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "technical", name: "Technical", color: "peach", order: 3, kind: "pipeline", role: "technical" },
  { id: "rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
];
const base: Application = {
  id: "a", company: "c", role: "r", tagIds: [], stageId: "saved", order: 0,
  createdAt: "x", updatedAt: "x", furthestStageId: "saved",
};

describe("applyFurthestOnMove", () => {
  it("deepens furthest when moving forward", () => {
    const out = applyFurthestOnMove(base, "technical", stages);
    expect(out.furthestStageId).toBe("technical");
  });
  it("keeps furthest when moving into terminal", () => {
    const moved = { ...base, furthestStageId: "technical" };
    expect(applyFurthestOnMove(moved, "rejected", stages).furthestStageId).toBe("technical");
  });
});
