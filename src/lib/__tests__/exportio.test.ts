import { describe, it, expect } from "vitest";
import { toJson, fromJson, toCsv } from "@/lib/exportio";
import { DEFAULT_SETTINGS } from "@/lib/repo";
import { emptyCvContent, DEFAULT_SECTIONS } from "@/cv/types";
import type { Snapshot } from "@/lib/types";

const snap: Snapshot = {
  stages: [{ id: "s1", name: "Applied", color: "pink", order: 0, kind: "pipeline" }],
  applications: [{
    id: "a1", company: 'Big "Co", Inc', role: "Engineer", tagIds: ["t1"], stageId: "s1",
    order: 0, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
  }],
  tags: [{ id: "t1", name: "Dream job", preset: true }],
  interviews: [], contacts: [], events: [], notes: [], reminders: [],
  settings: DEFAULT_SETTINGS,
  profile: null, cvdocs: [],
};

// The existing snap minus the v2-only cv fields, serialized as a version-1 file's data.
function legacyV1Data() {
  const { profile: _profile, cvdocs: _cvdocs, ...rest } = snap;
  return rest;
}

describe("exportio", () => {
  it("JSON round-trips losslessly", async () => {
    expect(fromJson(await toJson(snap))).toEqual(snap);
  });

  it("fromJson rejects garbage with a readable error", () => {
    expect(() => fromJson('{"nope": true}')).toThrow(/invalid/i);
  });

  it("fromJson rejects a non-http(s) application URL", async () => {
    const malicious: Snapshot = {
      ...snap,
      applications: [{ ...snap.applications[0], url: "javascript:alert(1)" }],
    };
    const json = await toJson(malicious);
    expect(() => fromJson(json)).toThrow(/http:\/\/ or https:\/\//);
  });

  it("CSV resolves names and quotes fields containing commas/quotes", () => {
    const csv = toCsv(snap);
    const [header, row] = csv.split("\n");
    expect(header).toContain("Company,Role,Stage,Tags");
    expect(row).toContain('"Big ""Co"", Inc"');
    expect(row).toContain("Applied");
    expect(row).toContain("Dream job");
  });

  it("v2 round-trips cvdocs and profile with photo blob", async () => {
    const photo = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" });
    const snap2: Snapshot = {
      ...snap,
      profile: { id: "singleton", content: emptyCvContent(), photo, updatedAt: "2026-07-12T00:00:00.000Z" },
      cvdocs: [{
        id: "cv1", name: "Test CV", templateId: "classic", accent: "sky", showPhoto: false,
        content: { ...emptyCvContent(), fullName: "Jon" }, sections: DEFAULT_SECTIONS,
        createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z",
      }],
    };
    const out = fromJson(await toJson(snap2));
    expect(out.cvdocs[0].content.fullName).toBe("Jon");
    expect(out.profile?.photo).toBeInstanceOf(Blob);
    expect(out.profile?.photo?.type).toBe("image/png");
    expect(new Uint8Array(await out.profile!.photo!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("accepts version-1 export files (no cv fields)", () => {
    const v1 = JSON.stringify({ version: 1, exportedAt: "x", data: legacyV1Data() });
    const out = fromJson(v1);
    expect(out.profile).toBeNull();
    expect(out.cvdocs).toEqual([]);
  });
});
