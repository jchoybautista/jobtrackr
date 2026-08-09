import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { dbNameFor, openDb, currentDb, setScope, closeDb, LEGACY_DB_NAME } from "@/lib/db";

beforeEach(() => { closeDb(); });

describe("database scoping", () => {
  it("names an account database after the user id", () => {
    expect(dbNameFor({ kind: "user", userId: "abc-123" })).toBe("jobtrackr-abc-123");
  });

  it("gives the demo its own sandbox", () => {
    expect(dbNameFor({ kind: "demo" })).toBe("jobtrackr-demo");
  });

  it("keeps the pre-auth name reserved as legacy", () => {
    expect(LEGACY_DB_NAME).toBe("jobtrackr");
    expect(dbNameFor({ kind: "user", userId: "x" })).not.toBe(LEGACY_DB_NAME);
    expect(dbNameFor({ kind: "demo" })).not.toBe(LEGACY_DB_NAME);
  });

  it("returns the same instance for the same scope", () => {
    const a = openDb({ kind: "user", userId: "u1" });
    const b = openDb({ kind: "user", userId: "u1" });
    expect(a).toBe(b);
  });

  it("returns different instances for different accounts", () => {
    const a = openDb({ kind: "user", userId: "u1" });
    const b = openDb({ kind: "user", userId: "u2" });
    expect(a).not.toBe(b);
    expect(a.name).toBe("jobtrackr-u1");
    expect(b.name).toBe("jobtrackr-u2");
  });

  it("throws a clear error when used before a scope is set", () => {
    expect(() => currentDb()).toThrow(/scope/i);
  });

  it("returns the scoped instance once set", () => {
    setScope({ kind: "demo" });
    expect(currentDb().name).toBe("jobtrackr-demo");
  });

  it("keeps two accounts' data apart", async () => {
    setScope({ kind: "user", userId: "u1" });
    await currentDb().tags.put({ id: "t1", name: "Only in u1", preset: false });

    setScope({ kind: "user", userId: "u2" });
    expect(await currentDb().tags.count()).toBe(0);

    setScope({ kind: "user", userId: "u1" });
    expect(await currentDb().tags.count()).toBe(1);
  });

  it("forgets the scope on close", () => {
    setScope({ kind: "demo" });
    closeDb();
    expect(() => currentDb()).toThrow(/scope/i);
  });

  it("closes the connection and evicts it, without losing data", async () => {
    setScope({ kind: "user", userId: "u3" });
    const first = currentDb();
    await first.tags.put({ id: "t1", name: "Survives sign-out", preset: false });

    closeDb();
    expect(first.isOpen()).toBe(false);

    // A fresh handle, not the closed one — reusing it would throw
    // DatabaseClosedError on the next read.
    setScope({ kind: "user", userId: "u3" });
    expect(currentDb()).not.toBe(first);
    expect(await currentDb().tags.count()).toBe(1);
  });
});
