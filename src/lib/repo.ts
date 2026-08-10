import { currentDb, type JobTrackrDb } from "./db";
import type { CvThumb } from "./db";
import type {
  Stage, Application, Tag, Interview, Contact,
  ActivityEvent, NoteDoc, Reminder, SettingsDoc, Snapshot,
  Profile, CvDoc,
} from "./types";

export const DEFAULT_SETTINGS: SettingsDoc = {
  id: "singleton", nudgeDays: 7, ghostDays: 14, currency: "USD", theme: "light", demo: false,
};

const allTables = (db: JobTrackrDb) => [
  db.stages, db.applications, db.tags, db.interviews, db.contacts,
  db.events, db.notes, db.reminders, db.settings, db.profile, db.cvdocs,
  db.cvthumbs, db.meta,
];

export async function loadAll(): Promise<Snapshot> {
  const db = currentDb();
  const [stages, applications, tags, interviews, contacts, events, notes, reminders, settings, profile, cvdocs] =
    await Promise.all([
      db.stages.orderBy("order").toArray(),
      db.applications.orderBy("order").toArray(),
      db.tags.toArray(),
      db.interviews.toArray(),
      db.contacts.toArray(),
      db.events.orderBy("at").reverse().toArray(),
      db.notes.toArray(),
      db.reminders.toArray(),
      db.settings.get("singleton"),
      db.profile.get("singleton"),
      db.cvdocs.orderBy("updatedAt").reverse().toArray(),
    ]);
  return { stages, applications, tags, interviews, contacts, events, notes, reminders,
    settings: settings ?? DEFAULT_SETTINGS, profile: profile ?? null, cvdocs };
}

export const putStage = (x: Stage) => currentDb().stages.put(x).then(() => {});
export const putStages = (xs: Stage[]) => currentDb().stages.bulkPut(xs).then(() => {});
export const putApplication = (x: Application) => currentDb().applications.put(x).then(() => {});
export const putApplications = (xs: Application[]) => currentDb().applications.bulkPut(xs).then(() => {});
export const putTag = (x: Tag) => currentDb().tags.put(x).then(() => {});
export const putInterview = (x: Interview) => currentDb().interviews.put(x).then(() => {});
export const putContact = (x: Contact) => currentDb().contacts.put(x).then(() => {});
export const putEvent = (x: ActivityEvent) => currentDb().events.put(x).then(() => {});
export const putNote = (x: NoteDoc) => currentDb().notes.put(x).then(() => {});
export const putReminder = (x: Reminder) => currentDb().reminders.put(x).then(() => {});
export const putSettings = (x: SettingsDoc) => currentDb().settings.put(x).then(() => {});
export const putProfile = (x: Profile) => currentDb().profile.put(x).then(() => {});
export const deleteProfile = () => currentDb().profile.delete("singleton");
export const putCvDoc = (x: CvDoc) => currentDb().cvdocs.put(x).then(() => {});
export const deleteCvDoc = (id: string) => currentDb().cvdocs.delete(id);
export const putCvThumb = (x: CvThumb) => currentDb().cvthumbs.put(x).then(() => {});
export const getCvThumb = (id: string) => currentDb().cvthumbs.get(id);
export const deleteCvThumb = (id: string) => currentDb().cvthumbs.delete(id);

export const deleteStage = (id: string) => currentDb().stages.delete(id);
export const deleteTag = (id: string) => currentDb().tags.delete(id);
export const deleteInterview = (id: string) => currentDb().interviews.delete(id);
export const deleteContact = (id: string) => currentDb().contacts.delete(id);
export const deleteNote = (id: string) => currentDb().notes.delete(id);
export const deleteReminder = (id: string) => currentDb().reminders.delete(id);

export async function deleteApplication(id: string): Promise<void> {
  const db = currentDb();
  await db.transaction("rw", allTables(db), async () => {
    await db.applications.delete(id);
    for (const t of [db.interviews, db.contacts, db.events, db.notes] as const) {
      await t.where("applicationId").equals(id).delete();
    }
    await db.reminders.filter((r) => r.applicationId === id).delete();
    await db.cvdocs.where("applicationId").equals(id).modify((c) => { delete c.applicationId; });
  });
}

export async function clearAll(): Promise<void> {
  const db = currentDb();
  await db.transaction("rw", allTables(db), async () => {
    for (const t of allTables(db)) await t.clear();
  });
}

type ImportSnapshot =
  Omit<Snapshot, "profile" | "cvdocs"> & { profile?: Profile | null; cvdocs?: CvDoc[] };

export async function importSnapshot(snap: ImportSnapshot, mode: "replace" | "merge"): Promise<void> {
  const db = currentDb();
  await db.transaction("rw", allTables(db), async () => {
    if (mode === "replace") for (const t of allTables(db)) await t.clear();
    await db.stages.bulkPut(snap.stages);
    await db.applications.bulkPut(snap.applications);
    await db.tags.bulkPut(snap.tags);
    await db.interviews.bulkPut(snap.interviews);
    await db.contacts.bulkPut(snap.contacts);
    await db.events.bulkPut(snap.events);
    await db.notes.bulkPut(snap.notes);
    await db.reminders.bulkPut(snap.reminders);
    await db.settings.put(snap.settings);
    if (snap.cvdocs) await db.cvdocs.bulkPut(snap.cvdocs);
    if (snap.profile) await db.profile.put(snap.profile);
  });
}
