import { describe, it, expect } from "vitest";
import { filterByStatus, sortApplications } from "@/lib/table";
import type { Application, Stage } from "@/lib/types";

const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline", role: "interview" },
  { id: "rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
  { id: "offer", name: "Offer", color: "mint", order: 6, kind: "won", role: "offer", pinned: true },
];
const app = (id: string, stageId: string, o: Partial<Application> = {}): Application => ({
  id, company: id, role: "r", tagIds: [], stageId, order: 0,
  createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z", ...o,
});
const apps = [app("a", "saved"), app("b", "interview"), app("c", "rejected"), app("d", "offer")];

describe("filterByStatus", () => {
  it("no filters returns all", () => {
    expect(filterByStatus(apps, [], [], stages)).toHaveLength(4);
  });
  it("filters by stage ids", () => {
    expect(filterByStatus(apps, ["interview"], [], stages).map((a) => a.id)).toEqual(["b"]);
  });
  it("filters by outcome", () => {
    expect(filterByStatus(apps, [], ["won"], stages).map((a) => a.id)).toEqual(["d"]);
    expect(filterByStatus(apps, [], ["active"], stages).map((a) => a.id).sort()).toEqual(["a", "b"]);
  });
  it("ANDs stage and outcome", () => {
    expect(filterByStatus(apps, ["offer"], ["lost"], stages)).toHaveLength(0);
  });
});

describe("sortApplications", () => {
  const NOW = "2026-07-01T00:00:00.000Z";
  it("sorts by company ascending and descending", () => {
    const asc = sortApplications(apps, "company", "asc", stages, NOW).map((a) => a.id);
    expect(asc).toEqual(["a", "b", "c", "d"]);
    const desc = sortApplications(apps, "company", "desc", stages, NOW).map((a) => a.id);
    expect(desc).toEqual(["d", "c", "b", "a"]);
  });
  it("sorts by status using stage order", () => {
    const asc = sortApplications(apps, "status", "asc", stages, NOW).map((a) => a.id);
    expect(asc).toEqual(["a", "b", "c", "d"]); // order 0,2,5,6
  });
});
