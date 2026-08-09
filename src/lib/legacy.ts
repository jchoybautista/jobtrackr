import Dexie from "dexie";
import { createDb, openDb, LEGACY_DB_NAME, type JobTrackrDb } from "./db";

const COPIED = [
  "stages", "applications", "tags", "interviews", "contacts",
  "events", "notes", "reminders", "settings", "profile", "cvdocs", "cvthumbs",
] as const;

async function isEmpty(db: JobTrackrDb): Promise<boolean> {
  const counts = await Promise.all(COPIED.map((t) => db.table(t).count()));
  return counts.every((n) => n === 0);
}

/**
 * Moves data from the pre-auth `jobtrackr` database into the first account to
 * sign in on this device.
 *
 * Two guards, deliberately: the claim record, and the target being empty. The
 * claim can be lost if a user clears site data for that database alone, and a
 * populated account must survive that anyway.
 */
export async function adoptLegacyDatabase(userId: string): Promise<"adopted" | "skipped"> {
  if (!(await Dexie.exists(LEGACY_DB_NAME))) return "skipped";

  const legacy = createDb(LEGACY_DB_NAME);
  try {
    await legacy.open();
    if (await legacy.meta.get("legacy")) return "skipped";
    if (await isEmpty(legacy)) return "skipped";

    const target = openDb({ kind: "user", userId });
    await target.open();
    if (!(await isEmpty(target))) return "skipped";

    for (const name of COPIED) {
      const rows = await legacy.table(name).toArray();
      if (rows.length) await target.table(name).bulkPut(rows);
    }

    await legacy.meta.put({ id: "legacy", claimedBy: userId, claimedAt: new Date().toISOString() });
    return "adopted";
  } finally {
    legacy.close();
  }
}
