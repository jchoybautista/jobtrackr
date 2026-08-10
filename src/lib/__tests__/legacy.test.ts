import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import { createDb, openDb, LEGACY_DB_NAME } from "@/lib/db";
import { adoptLegacyDatabase } from "@/lib/legacy";

const CLAIM_KEY = "jobtrackr:legacy-claimed-by";

/** Seeds every table the migration is supposed to carry, so a copy list that
 *  silently drops tables cannot pass. */
async function seedLegacy() {
  const legacy = createDb(LEGACY_DB_NAME);
  await legacy.stages.put({ id: "s1", name: "Saved", color: "lavender", order: 0, kind: "pipeline" });
  await legacy.applications.put({
    id: "a1", company: "Acme", role: "Dev", tagIds: [], stageId: "s1", order: 0,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  });
  await legacy.tags.put({ id: "t1", name: "From the old database", preset: false });
  await legacy.interviews.put({ id: "i1", applicationId: "a1", roundType: "phone", scheduledAt: "2026-02-01T00:00:00.000Z" });
  await legacy.contacts.put({ id: "c1", applicationId: "a1", name: "Sam" });
  await legacy.events.put({ id: "e1", applicationId: "a1", kind: "created", message: "Application created", at: "2026-01-01T00:00:00.000Z" });
  await legacy.notes.put({ id: "n1", applicationId: "a1", body: "Prep", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" });
  await legacy.reminders.put({ id: "r1", applicationId: "a1", type: "follow_up", title: "Chase", dueAt: "2026-02-02T00:00:00.000Z", done: false });
  await legacy.settings.put({ id: "singleton", nudgeDays: 7, ghostDays: 14, currency: "USD", theme: "light", demo: false });
  await legacy.profile.put({ id: "singleton", content: { fullName: "Old User", links: [], experience: [], education: [], skills: [], projects: [], certifications: [], languages: [], awards: [], volunteer: [], references: [], referencesOnRequest: false }, updatedAt: "2026-01-01T00:00:00.000Z" });
  await legacy.cvdocs.put({ id: "cv1", name: "Master", templateId: "classic", accent: "sky", showPhoto: false, content: { fullName: "Old User", links: [], experience: [], education: [], skills: [], projects: [], certifications: [], languages: [], awards: [], volunteer: [], references: [], referencesOnRequest: false }, sections: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
  legacy.close();
}

beforeEach(async () => {
  for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name);
  localStorage.removeItem(CLAIM_KEY);
});

describe("adoptLegacyDatabase", () => {
  it("carries every table across, not just the first one", async () => {
    await seedLegacy();
    expect(await adoptLegacyDatabase("u1")).toBe("adopted");

    const mine = openDb({ kind: "user", userId: "u1" });
    // Named individually: a copy list that quietly drops tables must fail here.
    expect(await mine.stages.count()).toBe(1);
    expect(await mine.applications.count()).toBe(1);
    expect(await mine.tags.count()).toBe(1);
    expect(await mine.interviews.count()).toBe(1);
    expect(await mine.contacts.count()).toBe(1);
    expect(await mine.events.count()).toBe(1);
    expect(await mine.notes.count()).toBe(1);
    expect(await mine.reminders.count()).toBe(1);
    expect(await mine.settings.count()).toBe(1);
    expect(await mine.profile.count()).toBe(1);
    expect(await mine.cvdocs.count()).toBe(1);
    expect((await mine.applications.get("a1"))?.company).toBe("Acme");
  });

  it("leaves the legacy database in place rather than deleting it", async () => {
    await seedLegacy();
    await adoptLegacyDatabase("u1");
    expect(await Dexie.exists(LEGACY_DB_NAME)).toBe(true);
  });

  it("does not upgrade the legacy database's schema", async () => {
    // The pre-auth app opens `jobtrackr` at v3. Bumping it to v4 would break
    // any rollback, and this code promises not to modify it.
    await seedLegacy();
    const before = await new Dexie(LEGACY_DB_NAME).open();
    const version = before.verno;
    before.close();

    await adoptLegacyDatabase("u1");

    const after = await new Dexie(LEGACY_DB_NAME).open();
    expect(after.verno).toBe(version);
    after.close();
  });

  it("records the claim where every account on the device can see it", async () => {
    await seedLegacy();
    await adoptLegacyDatabase("u1");
    expect(localStorage.getItem(CLAIM_KEY)).toBe("u1");
  });

  it("does nothing for a second account on the same device", async () => {
    await seedLegacy();
    await adoptLegacyDatabase("u1");
    expect(await adoptLegacyDatabase("u2")).toBe("skipped");
    expect(await openDb({ kind: "user", userId: "u2" }).applications.count()).toBe(0);
  });

  it("does not copy one person's job hunt into another's account when two sign in at once", async () => {
    await seedLegacy();
    const [a, b] = await Promise.all([adoptLegacyDatabase("u1"), adoptLegacyDatabase("u2")]);
    expect([a, b].filter((r) => r === "adopted")).toHaveLength(1);

    const u1 = await openDb({ kind: "user", userId: "u1" }).applications.count();
    const u2 = await openDb({ kind: "user", userId: "u2" }).applications.count();
    expect(u1 + u2).toBe(1);
  });

  it("never overwrites an account that already has data", async () => {
    await seedLegacy();
    const mine = openDb({ kind: "user", userId: "u1" });
    await mine.tags.put({ id: "mine", name: "Already here", preset: false });

    expect(await adoptLegacyDatabase("u1")).toBe("skipped");
    expect(await mine.tags.count()).toBe(1);
    expect((await mine.tags.get("mine"))?.name).toBe("Already here");
  });

  it("retries after a failed copy instead of stranding the data", async () => {
    // A quota error mid-copy must roll the target back to empty so the next
    // sign-in can try again — a half-copied account would look "not empty"
    // and be skipped forever.
    await seedLegacy();
    localStorage.setItem(CLAIM_KEY, "u1");   // as if a previous attempt claimed then died

    expect(await adoptLegacyDatabase("u1")).toBe("adopted");
    expect(await openDb({ kind: "user", userId: "u1" }).applications.count()).toBe(1);
  });

  it("does nothing when there is no legacy database", async () => {
    expect(await adoptLegacyDatabase("u1")).toBe("skipped");
  });

  it("does not create a legacy database for someone who never had one", async () => {
    await adoptLegacyDatabase("u1");
    expect(await Dexie.exists(LEGACY_DB_NAME)).toBe(false);
  });
});
