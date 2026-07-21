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
  profile: EntityTable<Profile, "id">;
  cvdocs: EntityTable<CvDoc, "id">;
  cvthumbs: EntityTable<CvThumb, "id">;
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

db.version(2).stores({
  stages: "id, order",
  applications: "id, stageId, order, updatedAt",
  tags: "id",
  interviews: "id, applicationId, scheduledAt",
  contacts: "id, applicationId",
  events: "id, applicationId, at",
  notes: "id, applicationId",
  reminders: "id, dueAt, done",
  settings: "id",
  profile: "id",
  cvdocs: "id, applicationId, updatedAt",
});

db.version(3).stores({
  stages: "id, order",
  applications: "id, stageId, order, updatedAt",
  tags: "id",
  interviews: "id, applicationId, scheduledAt",
  contacts: "id, applicationId",
  events: "id, applicationId, at",
  notes: "id, applicationId",
  reminders: "id, dueAt, done",
  settings: "id",
  profile: "id",
  cvdocs: "id, applicationId, updatedAt",
  cvthumbs: "id",
});

// Middleware to preserve Blob type through IndexedDB serialization
(db.cvthumbs as any).hook("creating", function (primKey: string, obj: any) {
  if (obj.blob instanceof Blob) {
    // Store type metadata alongside blob
    obj._blobType = obj.blob.type;
  }
  return obj;
});

(db.cvthumbs as any).hook("reading", function (obj: any) {
  if (!obj) return obj;
  // Reconstruct Blob from metadata if needed
  const blobType = obj._blobType;
  if (blobType && obj.blob && !(obj.blob instanceof Blob)) {
    // Blob was serialized as empty object, reconstruct with type
    obj.blob = new Blob([], { type: blobType });
  }
  return obj;
});
