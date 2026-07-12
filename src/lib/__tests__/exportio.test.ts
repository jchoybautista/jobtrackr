import { describe, it, expect } from "vitest";
import { toJson, fromJson, toCsv } from "@/lib/exportio";
import { DEFAULT_SETTINGS } from "@/lib/repo";
import type { Snapshot } from "@/lib/types";

// CV builder fields are excluded from JSON/CSV export (see exportio.ts).
type ExportSnapshot = Omit<Snapshot, "profile" | "cvdocs">;

const snap: ExportSnapshot = {
  stages: [{ id: "s1", name: "Applied", color: "pink", order: 0, kind: "pipeline" }],
  applications: [{
    id: "a1", company: 'Big "Co", Inc', role: "Engineer", tagIds: ["t1"], stageId: "s1",
    order: 0, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
  }],
  tags: [{ id: "t1", name: "Dream job", preset: true }],
  interviews: [], contacts: [], events: [], notes: [], reminders: [],
  settings: DEFAULT_SETTINGS,
};

describe("exportio", () => {
  it("JSON round-trips losslessly", () => {
    expect(fromJson(toJson(snap))).toEqual(snap);
  });

  it("fromJson rejects garbage with a readable error", () => {
    expect(() => fromJson('{"nope": true}')).toThrow(/invalid/i);
  });

  it("fromJson rejects a non-http(s) application URL", () => {
    const malicious: ExportSnapshot = {
      ...snap,
      applications: [{ ...snap.applications[0], url: "javascript:alert(1)" }],
    };
    expect(() => fromJson(toJson(malicious))).toThrow(/http:\/\/ or https:\/\//);
  });

  it("CSV resolves names and quotes fields containing commas/quotes", () => {
    const csv = toCsv(snap);
    const [header, row] = csv.split("\n");
    expect(header).toContain("Company,Role,Stage,Tags");
    expect(row).toContain('"Big ""Co"", Inc"');
    expect(row).toContain("Applied");
    expect(row).toContain("Dream job");
  });
});
