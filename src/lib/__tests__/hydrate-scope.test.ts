import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Dexie from "dexie";
import { useApp } from "@/lib/store";
import { currentDb } from "@/lib/db";
import * as legacy from "@/lib/legacy";
import * as repo from "@/lib/repo";

beforeEach(async () => {
  for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name);
  useApp.setState({
    ready: false, applications: [], stages: [], cvdocs: [], profile: null, persistBroken: false,
  });
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
    // The window this guards is one line wide, inside repo.loadAll:
    // `const db = currentDb()` binds before the Promise.all resolves, and
    // every other repo call re-resolves currentDb() per call. So a test that
    // gates *before* loadAll (e.g. on adoptLegacyDatabase) resumes into
    // u2's now-active scope and reads u2's empty board either way — passing
    // with or without the guard. To exercise the real hazard, the real read
    // must complete while u1 is still the active scope (genuinely capturing
    // u1's row), and only loadAll's *return* may be held until after u2 has
    // fully signed in.
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    await useApp.getState().addApplication({ company: "Acme", role: "Dev" });
    useApp.setState({ ready: false });

    const realLoadAll = repo.loadAll;
    let call = 0;
    let armed!: () => void;
    const reachedFinalCall = new Promise<void>((resolve) => { armed = resolve; });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const spy = vi.spyOn(repo, "loadAll").mockImplementation(async () => {
      call++;
      if (call === 1) return realLoadAll(); // ensureBaseline's own check (store.ts)
      if (call === 2) {
        // The real, final read — captured now, while u1 is still active, so
        // it genuinely reflects u1's row. Only its return is delayed.
        const real = await realLoadAll();
        armed();
        await gate;
        return real;
      }
      return realLoadAll();
    });

    const slow = useApp.getState().hydrate({ kind: "user", userId: "u1" });
    await reachedFinalCall; // u1's own read has resolved; only the return is held
    await useApp.getState().hydrate({ kind: "user", userId: "u2" });
    expect(useApp.getState().applications).toEqual([]);   // u2's empty board

    release();
    await slow;
    spy.mockRestore();

    // u1's stale snapshot resolved last. It must not have landed in u2's UI.
    expect(currentDb().name).toBe("jobtrackr-u2");
    expect(useApp.getState().applications).toEqual([]);
  });

  it("a hydrate that fails after sign-out does not mark the new account's board broken", async () => {
    // resetLocal() (sign-out) can close the database out from under a pending
    // read, making it reject well after a different account has finished
    // hydrating. Without the catch path's own seq guard, that stale failure
    // would flip persistBroken on whatever account happens to be active.
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });

    let armed!: () => void;
    const reached = new Promise<void>((resolve) => { armed = resolve; });
    let rejectRead!: (err: unknown) => void;
    const gate = new Promise<never>((_, reject) => { rejectRead = reject; });
    const spy = vi.spyOn(repo, "loadAll").mockImplementationOnce(() => {
      armed();
      return gate;
    });

    const slow = useApp.getState().hydrate({ kind: "user", userId: "u1" });
    await reached;
    useApp.getState().resetLocal(); // sign out mid-load
    await useApp.getState().hydrate({ kind: "user", userId: "u2" });
    expect(useApp.getState().persistBroken).toBe(false);

    rejectRead(new Error("closed"));
    await slow;
    spy.mockRestore();

    expect(useApp.getState().persistBroken).toBe(false);
  });

  it("clears persistBroken once a hydrate succeeds after a prior failure", async () => {
    // A transient storage failure must not pin the "storage is unavailable"
    // banner for the rest of the session — the next successful hydrate (same
    // account, another account, sign-out and back in) has to clear it.
    const spy = vi.spyOn(repo, "loadAll").mockRejectedValueOnce(new Error("boom"));
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    spy.mockRestore();
    expect(useApp.getState().persistBroken).toBe(true);

    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    expect(useApp.getState().persistBroken).toBe(false);
    expect(useApp.getState().ready).toBe(true);
  });

  it("resetLocal clears persistBroken too", async () => {
    const spy = vi.spyOn(repo, "loadAll").mockRejectedValueOnce(new Error("boom"));
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    spy.mockRestore();
    expect(useApp.getState().persistBroken).toBe(true);

    useApp.getState().resetLocal();
    expect(useApp.getState().persistBroken).toBe(false);
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
