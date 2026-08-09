import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import { createDb, openDb, LEGACY_DB_NAME } from "@/lib/db";
import { adoptLegacyDatabase } from "@/lib/legacy";

async function seedLegacy() {
  const legacy = createDb(LEGACY_DB_NAME);
  await legacy.tags.put({ id: "t1", name: "From the old database", preset: false });
  await legacy.applications.put({
    id: "a1", company: "Acme", role: "Dev", tagIds: [], stageId: "stage-saved", order: 0,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  });
  legacy.close();
}

beforeEach(async () => {
  for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name);
});

describe("adoptLegacyDatabase", () => {
  it("copies the legacy data into an empty account database", async () => {
    await seedLegacy();
    expect(await adoptLegacyDatabase("u1")).toBe("adopted");

    const mine = openDb({ kind: "user", userId: "u1" });
    expect(await mine.tags.count()).toBe(1);
    expect((await mine.applications.get("a1"))?.company).toBe("Acme");
  });

  it("leaves the legacy database in place rather than deleting it", async () => {
    await seedLegacy();
    await adoptLegacyDatabase("u1");
    expect(await Dexie.exists(LEGACY_DB_NAME)).toBe(true);
  });

  it("records who claimed it", async () => {
    await seedLegacy();
    await adoptLegacyDatabase("u1");
    const legacy = createDb(LEGACY_DB_NAME);
    expect((await legacy.meta.get("legacy"))?.claimedBy).toBe("u1");
  });

  it("does nothing for a second account on the same device", async () => {
    await seedLegacy();
    await adoptLegacyDatabase("u1");
    expect(await adoptLegacyDatabase("u2")).toBe("skipped");
    expect(await openDb({ kind: "user", userId: "u2" }).tags.count()).toBe(0);
  });

  it("never overwrites an account that already has data", async () => {
    await seedLegacy();
    const mine = openDb({ kind: "user", userId: "u1" });
    await mine.tags.put({ id: "mine", name: "Already here", preset: false });

    expect(await adoptLegacyDatabase("u1")).toBe("skipped");
    expect(await mine.tags.count()).toBe(1);
    expect((await mine.tags.get("mine"))?.name).toBe("Already here");
  });

  it("does nothing when there is no legacy database", async () => {
    expect(await adoptLegacyDatabase("u1")).toBe("skipped");
  });
});
