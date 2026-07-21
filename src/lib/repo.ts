import { db } from "./db";
import type { CvThumb } from "./db";
import type {
  Stage, Application, Tag, Interview, Contact,
  ActivityEvent, NoteDoc, Reminder, SettingsDoc, Snapshot,
  Profile, CvDoc,
} from "./types";

export const DEFAULT_SETTINGS: SettingsDoc = {
  id: "singleton", nudgeDays: 7, currency: "USD", theme: "light", demo: false,
};

const ALL_TABLES = [
  db.stages, db.applications, db.tags, db.interviews, db.contacts,
  db.events, db.notes, db.reminders, db.settings, db.profile, db.cvdocs,
  db.cvthumbs,
];

export async function loadAll(): Promise<Snapshot> {
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

export const putStage = (x: Stage) => db.stages.put(x).then(() => {});
export const putStages = (xs: Stage[]) => db.stages.bulkPut(xs).then(() => {});
export const putApplication = (x: Application) => db.applications.put(x).then(() => {});
export const putApplications = (xs: Application[]) => db.applications.bulkPut(xs).then(() => {});
export const putTag = (x: Tag) => db.tags.put(x).then(() => {});
export const putInterview = (x: Interview) => db.interviews.put(x).then(() => {});
export const putContact = (x: Contact) => db.contacts.put(x).then(() => {});
export const putEvent = (x: ActivityEvent) => db.events.put(x).then(() => {});
export const putNote = (x: NoteDoc) => db.notes.put(x).then(() => {});
export const putReminder = (x: Reminder) => db.reminders.put(x).then(() => {});
export const putSettings = (x: SettingsDoc) => db.settings.put(x).then(() => {});
export const putProfile = (x: Profile) => db.profile.put(x).then(() => {});
export const putCvDoc = (x: CvDoc) => db.cvdocs.put(x).then(() => {});
export const deleteCvDoc = (id: string) => db.cvdocs.delete(id);
export const putCvThumb = (x: CvThumb) => db.cvthumbs.put(x).then(() => {});
export const getCvThumb = (id: string) => db.cvthumbs.get(id);
export const deleteCvThumb = (id: string) => db.cvthumbs.delete(id);

export const deleteStage = (id: string) => db.stages.delete(id);
export const deleteTag = (id: string) => db.tags.delete(id);
export const deleteInterview = (id: string) => db.interviews.delete(id);
export const deleteContact = (id: string) => db.contacts.delete(id);
export const deleteNote = (id: string) => db.notes.delete(id);
export const deleteReminder = (id: string) => db.reminders.delete(id);

export async function deleteApplication(id: string): Promise<void> {
  await db.transaction("rw", ALL_TABLES, async () => {
    await db.applications.delete(id);
    for (const t of [db.interviews, db.contacts, db.events, db.notes] as const) {
      await t.where("applicationId").equals(id).delete();
    }
    await db.reminders.filter((r) => r.applicationId === id).delete();
    await db.cvdocs.where("applicationId").equals(id).modify((c) => { delete c.applicationId; });
  });
}

export async function clearAll(): Promise<void> {
  await db.transaction("rw", ALL_TABLES, async () => {
    for (const t of ALL_TABLES) await t.clear();
  });
}

type ImportSnapshot =
  Omit<Snapshot, "profile" | "cvdocs"> & { profile?: Profile | null; cvdocs?: CvDoc[] };

export async function importSnapshot(snap: ImportSnapshot, mode: "replace" | "merge"): Promise<void> {
  await db.transaction("rw", ALL_TABLES, async () => {
    if (mode === "replace") for (const t of ALL_TABLES) await t.clear();
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
