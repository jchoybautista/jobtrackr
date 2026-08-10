import Dexie from "dexie";
import { openDb, LEGACY_DB_NAME, type JobTrackrDb } from "./db";

const COPIED = [
  "stages", "applications", "tags", "interviews", "contacts",
  "events", "notes", "reminders", "settings", "profile", "cvdocs", "cvthumbs",
] as const;

/**
 * Which account claimed this device's pre-auth data.
 *
 * Deliberately localStorage rather than a row in the legacy database: the claim
 * has to be readable by every account on the device, and writing to `jobtrackr`
 * would mean opening it at schema v4 — upgrading a database this code promises
 * never to modify, and stranding anyone whose app rolls back to a build that
 * opens it at v3.
 */
const CLAIM_KEY = "jobtrackr:legacy-claimed-by";

/** Backs the claim when localStorage is unavailable (private mode, blocked
 *  storage). Only covers this page session, but that is where concurrent
 *  sign-ins actually happen — without it, a throwing localStorage silently
 *  removes the guard and every account adopts the same data. */
let memoryClaim: string | null = null;

function readClaim(): string | null {
  try { return localStorage.getItem(CLAIM_KEY); } catch { return memoryClaim; }
}

function writeClaim(userId: string): void {
  try { localStorage.setItem(CLAIM_KEY, userId); } catch { memoryClaim = userId; }
}

function clearClaim(): void {
  try { localStorage.removeItem(CLAIM_KEY); } catch { memoryClaim = null; }
}

async function isEmpty(db: JobTrackrDb): Promise<boolean> {
  const counts = await Promise.all(COPIED.map((t) => db.table(t).count()));
  return counts.every((n) => n === 0);
}

/**
 * Moves data from the pre-auth `jobtrackr` database into the first account to
 * sign in on this device. Runs once, unattended, with no undo — so the order of
 * operations is the whole design:
 *
 * 1. Claim before copying. Two accounts signing in together must not both
 *    receive a copy of the first person's job hunt.
 * 2. Copy inside ONE transaction. Twelve independent bulkPuts would leave a
 *    half-populated account after a quota error — and a half-populated account
 *    is no longer empty, so the retry guard would skip it forever.
 * 3. Re-claiming by the same account is allowed, so a crashed copy retries.
 * 4. Read the legacy database without declaring a schema, so opening it cannot
 *    upgrade it.
 *
 * The legacy database is never deleted or modified. A botched copy is always
 * recoverable from disk.
 */
export async function adoptLegacyDatabase(userId: string): Promise<"adopted" | "skipped"> {
  // Claim synchronously, before this function yields for the first time.
  // localStorage is synchronous and JavaScript is single-threaded, so a read
  // and a write with no await between them cannot interleave with another
  // call — which is the entire protection against two accounts signing in
  // together and both copying the same person's job hunt. Putting either half
  // after an await reopens that window.
  const existing = readClaim();
  if (existing && existing !== userId) return "skipped";
  const claimedHere = !existing;
  if (claimedHere) writeClaim(userId);

  let adopted = false;
  let legacy: Dexie | null = null;
  try {
    if (!(await Dexie.exists(LEGACY_DB_NAME))) return "skipped";

    // No version declared: Dexie reads whatever schema is on disk, so a v3
    // database stays v3.
    legacy = new Dexie(LEGACY_DB_NAME);
    await legacy.open();
    const present = new Set(legacy.tables.map((t) => t.name));
    const tables = COPIED.filter((t) => present.has(t));

    const rows = await Promise.all(tables.map((t) => legacy!.table(t).toArray()));
    if (rows.every((r) => r.length === 0)) return "skipped";

    const target = openDb({ kind: "user", userId });
    await target.open();
    if (!(await isEmpty(target))) return "skipped";

    // One transaction: a failure rolls the target back to empty, so the next
    // sign-in by this same account retries cleanly.
    await target.transaction("rw", tables.map((t) => target.table(t)), async () => {
      for (let i = 0; i < tables.length; i++) {
        if (rows[i].length) await target.table(tables[i]).bulkPut(rows[i]);
      }
    });

    adopted = true;
    return "adopted";
  } finally {
    // Claiming up front is what makes the guard atomic, but it means a run that
    // copies nothing would otherwise hold the device's claim forever — locking
    // out the account that actually owns this data. Give it back.
    if (claimedHere && !adopted) clearClaim();
    legacy?.close();
  }
}
