import Dexie, { type EntityTable } from "dexie";
import type {
  Stage, Application, Tag, Interview, Contact,
  ActivityEvent, NoteDoc, Reminder, SettingsDoc,
} from "./types";

export const db = new Dexie("jobtrackr") as Dexie & {
  stages: EntityTable<Stage, "id">;
  applications: EntityTable<Application, "id">;
  tags: EntityTable<Tag, "id">;
  interviews: EntityTable<Interview, "id">;
  contacts: EntityTable<Contact, "id">;
  events: EntityTable<ActivityEvent, "id">;
  notes: EntityTable<NoteDoc, "id">;
  reminders: EntityTable<Reminder, "id">;
  settings: EntityTable<SettingsDoc, "id">;
};

db.version(1).stores({
  stages: "id, order",
  applications: "id, stageId, order, updatedAt",
  tags: "id",
  interviews: "id, applicationId, scheduledAt",
  contacts: "id, applicationId",
  events: "id, applicationId, at",
  notes: "id, applicationId",
  reminders: "id, dueAt, done",
  settings: "id",
});
