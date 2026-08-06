import { describe, it, expect } from "vitest";
import { stageByRole, orderOfRole, furthestOrderOf, nextFurthestStageId } from "@/lib/furthest";
import type { Application, Stage } from "@/lib/types";

const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "screening", name: "Screening", color: "sky", order: 1, kind: "pipeline", role: "screening" },
  { id: "interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline", role: "interview" },
  { id: "technical", name: "Technical", color: "peach", order: 3, kind: "pipeline", role: "technical" },
  { id: "final", name: "Final", color: "orchid", order: 4, kind: "pipeline", role: "final" },
  { id: "rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
  { id: "offer", name: "Offer", color: "mint", order: 6, kind: "won", role: "offer", pinned: true },
];
const app = (o: Partial<Application>): Application => ({
  id: "a", company: "c", role: "r", tagIds: [], stageId: "saved", order: 0,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...o,
});

describe("role helpers", () => {
  it("finds stages and orders by role", () => {
    expect(stageByRole(stages, "technical")?.id).toBe("technical");
    expect(orderOfRole(stages, "technical")).toBe(3);
    expect(orderOfRole(stages, "screening")).toBe(1);
  });
});

describe("furthestOrderOf", () => {
  it("uses furthestStageId when set", () => {
    expect(furthestOrderOf(app({ stageId: "rejected", furthestStageId: "technical" }), stages)).toBe(3);
  });
  it("falls back to current pipeline stage when unset", () => {
    expect(furthestOrderOf(app({ stageId: "interview" }), stages)).toBe(2);
  });
  it("returns -1 for a terminal app with no furthest recorded", () => {
    expect(furthestOrderOf(app({ stageId: "rejected" }), stages)).toBe(-1);
  });
});

describe("nextFurthestStageId", () => {
  const technical = stages[3];
  const screening = stages[1];
  const rejected = stages[5];
  it("deepens when moving into a deeper pipeline stage", () => {
    expect(nextFurthestStageId(app({ furthestStageId: "screening" }), technical, stages)).toBe("technical");
  });
  it("does not shrink when moving backward", () => {
    expect(nextFurthestStageId(app({ furthestStageId: "technical" }), screening, stages)).toBe("technical");
  });
  it("is unchanged when moving into a terminal stage", () => {
    expect(nextFurthestStageId(app({ furthestStageId: "technical" }), rejected, stages)).toBe("technical");
  });
  it("initializes from undefined", () => {
    expect(nextFurthestStageId(app({ furthestStageId: undefined }), screening, stages)).toBe("screening");
  });
});
