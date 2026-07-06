import { describe, it, expect } from "vitest";
import { moveCard, reorderStages } from "@/lib/ordering";
import type { Application, Stage } from "@/lib/types";

const NOW = "2026-07-06T12:00:00.000Z";
const app = (id: string, stageId: string, order: number): Application => ({
  id, company: id, role: "r", tagIds: [], stageId, order,
  createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
});

const board = [app("a", "s1", 0), app("b", "s1", 1), app("c", "s1", 2), app("x", "s2", 0)];

const inStage = (apps: Application[], s: string) =>
  apps.filter((a) => a.stageId === s).sort((a, b) => a.order - b.order).map((a) => a.id);

describe("moveCard", () => {
  it("reorders within a column", () => {
    const out = moveCard(board, "c", "s1", 0, NOW);
    expect(inStage(out, "s1")).toEqual(["c", "a", "b"]);
    expect(out.find((a) => a.id === "c")!.updatedAt).toBe(NOW);
  });

  it("moves across columns and reindexes both", () => {
    const out = moveCard(board, "a", "s2", 1, NOW);
    expect(inStage(out, "s1")).toEqual(["b", "c"]);
    expect(inStage(out, "s2")).toEqual(["x", "a"]);
    expect(out.find((a) => a.id === "b")!.order).toBe(0);
  });

  it("clamps toIndex beyond column length", () => {
    const out = moveCard(board, "a", "s2", 99, NOW);
    expect(inStage(out, "s2")).toEqual(["x", "a"]);
  });

  it("does not mutate the input array", () => {
    moveCard(board, "a", "s2", 0, NOW);
    expect(inStage(board, "s1")).toEqual(["a", "b", "c"]);
  });
});

describe("reorderStages", () => {
  const stages: Stage[] = [
    { id: "s1", name: "A", color: "pink", order: 0, kind: "pipeline" },
    { id: "s2", name: "B", color: "mint", order: 1, kind: "pipeline" },
    { id: "s3", name: "C", color: "gray", order: 2, kind: "lost" },
  ];
  it("moves a stage and reindexes", () => {
    const out = reorderStages(stages, "s3", 0);
    expect(out.sort((a, b) => a.order - b.order).map((s) => s.id)).toEqual(["s3", "s1", "s2"]);
  });
});
