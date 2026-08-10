import Dexie, { type EntityTable } from "dexie";
import type {
  Stage, Application, Tag, Interview, Contact,
  ActivityEvent, NoteDoc, Reminder, SettingsDoc,
} from "./types";
import type { Profile, CvDoc } from "@/cv/types";

export interface CvThumb {
  id: string;
  blob: Blob;
  updatedAt: string;
}

/** Single-row bookkeeping that must travel with the data it describes. */
export interface MetaRecord {
  id: "legacy";
  claimedBy: string;
  claimedAt: string;
}

export type JobTrackrDb = Dexie & {
  stages: EntityTable<Stage, "id">;
  applications: EntityTable<Application, "id">;
  tags: EntityTable<Tag, "id">;
  interviews: EntityTable<Interview, "id">;
  contacts: EntityTable<Contact, "id">;
  events: EntityTable<ActivityEvent, "id">;
  notes: EntityTable<NoteDoc, "id">;
  reminders: EntityTable<Reminder, "id">;
  settings: EntityTable<SettingsDoc, "id">;
  profile: EntityTable<Profile, "id">;
  cvdocs: EntityTable<CvDoc, "id">;
  cvthumbs: EntityTable<CvThumb, "id">;
  meta: EntityTable<MetaRecord, "id">;
};

/** The pre-auth database name. Reserved: no scope may ever resolve to it. */
export const LEGACY_DB_NAME = "jobtrackr";

export type DbScope =
  | { kind: "user"; userId: string }
  | { kind: "demo" };

export function dbNameFor(scope: DbScope): string {
  return scope.kind === "demo" ? "jobtrackr-demo" : `jobtrackr-${scope.userId}`;
}

const V1_V3 = {
  stages: "id, order",
  applications: "id, stageId, order, updatedAt",
  tags: "id",
  interviews: "id, applicationId, scheduledAt",
  contacts: "id, applicationId",
  events: "id, applicationId, at",
  notes: "id, applicationId",
  reminders: "id, dueAt, done",
  settings: "id",
};

export function createDb(name: string): JobTrackrDb {
  const db = new Dexie(name) as JobTrackrDb;
  db.version(1).stores({ ...V1_V3 });
  db.version(2).stores({ ...V1_V3, profile: "id", cvdocs: "id, applicationId, updatedAt" });
  db.version(3).stores({ ...V1_V3, profile: "id", cvdocs: "id, applicationId, updatedAt", cvthumbs: "id" });
  db.version(4).stores({
    ...V1_V3, profile: "id", cvdocs: "id, applicationId, updatedAt", cvthumbs: "id", meta: "id",
  });
  return db;
}

const instances = new Map<string, JobTrackrDb>();
let active: JobTrackrDb | null = null;

/** Memoized per database name — opening the same Dexie name twice would give
 *  two connections fighting over the same upgrade transaction. */
export function openDb(scope: DbScope): JobTrackrDb {
  const name = dbNameFor(scope);
  let db = instances.get(name);
  if (!db) {
    db = createDb(name);
    instances.set(name, db);
  }
  return db;
}

export function setScope(scope: DbScope): void {
  active = openDb(scope);
}

export function currentDb(): JobTrackrDb {
  if (!active) {
    throw new Error(
      "No database scope is set — call setScope() with the signed-in user or " +
      "the demo scope before reading or writing.",
    );
  }
  return active;
}

/**
 * Sign-out: close the connection and forget the handle, keeping every byte on
 * disk. Both halves matter — an open connection blocks version upgrades in
 * other tabs, and evicting without closing would leak one per account, while
 * closing without evicting would hand the next openDb a dead handle.
 */
export function closeDb(): void {
  if (!active) return;
  instances.delete(active.name);
  active.close();
  active = null;
}
