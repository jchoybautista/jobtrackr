import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Dexie from "dexie";
import { useApp } from "@/lib/store";
import { currentDb } from "@/lib/db";
import * as legacy from "@/lib/legacy";

beforeEach(async () => {
  for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name);
  useApp.setState({ ready: false, applications: [], stages: [], cvdocs: [], profile: null });
});

describe("hydrate(scope)", () => {
  it("seeds the demo dataset in the demo sandbox", async () => {
    await useApp.getState().hydrate({ kind: "demo" });
    expect(useApp.getState().applications.length).toBeGreaterThan(30);
    expect(useApp.getState().settings.demo).toBe(true);
    expect(currentDb().name).toBe("jobtrackr-demo");
  });

  it("gives a new account an empty board, not the demo", async () => {
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    expect(useApp.getState().applications).toEqual([]);
    expect(useApp.getState().settings.demo).toBe(false);
    expect(useApp.getState().stages.length).toBeGreaterThan(0);
    expect(currentDb().name).toBe("jobtrackr-u1");
  });

  it("keeps two accounts' boards apart", async () => {
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    await useApp.getState().addApplication({ company: "Acme", role: "Dev" });

    await useApp.getState().hydrate({ kind: "user", userId: "u2" });
    expect(useApp.getState().applications).toEqual([]);

    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    expect(useApp.getState().applications).toHaveLength(1);
  });

  it("still loads the board when the legacy migration fails", async () => {
    // A failed migration must not read as broken storage — the old data is
    // still on disk and the next sign-in retries.
    const spy = vi.spyOn(legacy, "adoptLegacyDatabase")
      .mockRejectedValueOnce(new Error("QuotaExceededError"));
    await useApp.getState().hydrate({ kind: "user", userId: "u9" });
    spy.mockRestore();

    expect(useApp.getState().ready).toBe(true);
    expect(useApp.getState().persistBroken).toBe(false);
    expect(useApp.getState().stages.length).toBeGreaterThan(0);
  });

  it("drops a slow hydrate that a newer one superseded", async () => {
    // u1's load is still in flight when u2 signs in. Held deterministically by
    // gating the migration step, because relying on natural async ordering
    // lets this pass with the guard removed.
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    await useApp.getState().addApplication({ company: "Acme", role: "Dev" });

    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const spy = vi.spyOn(legacy, "adoptLegacyDatabase")
      .mockImplementationOnce(async () => { await gate; return "skipped"; });

    const slow = useApp.getState().hydrate({ kind: "user", userId: "u1" });
    await useApp.getState().hydrate({ kind: "user", userId: "u2" });
    expect(useApp.getState().applications).toEqual([]);   // u2's empty board

    release();
    await slow;
    spy.mockRestore();

    // u1's snapshot resolved last. It must not have landed in u2's UI.
    expect(currentDb().name).toBe("jobtrackr-u2");
    expect(useApp.getState().applications).toEqual([]);
  });

  it("resetLocal empties the store without deleting data", async () => {
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    await useApp.getState().addApplication({ company: "Acme", role: "Dev" });

    useApp.getState().resetLocal();
    expect(useApp.getState().applications).toEqual([]);
    expect(useApp.getState().ready).toBe(false);

    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    expect(useApp.getState().applications).toHaveLength(1);
  });
});
