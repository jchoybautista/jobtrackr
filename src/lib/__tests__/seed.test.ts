import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, loadAll } from "@/lib/repo";
import { seedIfEmpty, clearDemoData, DEFAULT_STAGES, PRESET_TAGS } from "@/lib/seed";

beforeEach(async () => { await clearAll(); });

describe("seed", () => {
  it("seeds a fresh db with stages, preset tags, and demo apps", async () => {
    const seeded = await seedIfEmpty();
    expect(seeded).toBe(true);
    const snap = await loadAll();
    expect(snap.stages).toHaveLength(DEFAULT_STAGES.length);
    expect(snap.tags).toHaveLength(PRESET_TAGS.length);
    expect(snap.applications.length).toBeGreaterThanOrEqual(5);
    expect(snap.settings.demo).toBe(true);
  });

  it("is idempotent — second call does nothing", async () => {
    await seedIfEmpty();
    const seeded = await seedIfEmpty();
    expect(seeded).toBe(false);
  });

  it("clearDemoData removes demo apps and their children but keeps stages", async () => {
    await seedIfEmpty();
    await clearDemoData();
    const snap = await loadAll();
    expect(snap.applications).toEqual([]);
    expect(snap.interviews).toEqual([]);
    expect(snap.stages).toHaveLength(DEFAULT_STAGES.length);
    expect(snap.settings.demo).toBe(false);
  });
});
