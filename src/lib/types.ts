import type { Profile, CvDoc } from "@/cv/types";
export type { Profile, CvDoc } from "@/cv/types";

export type PaletteKey =
  | "pink" | "peach" | "yellow" | "mint" | "sky"
  | "lavender" | "orchid" | "gray" | "sage" | "blush";

export type StageKind = "pipeline" | "won" | "lost";

export interface Stage {
  id: string;
  name: string;
  color: PaletteKey;
  order: number;
  kind: StageKind;
}

export type WorkMode = "remote" | "hybrid" | "onsite";

export interface Application {
  id: string;
  company: string;
  role: string;
  location?: string;
  workMode?: WorkMode;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  url?: string;
  source?: string;
  jdSnapshot?: string;
  tagIds: string[];
  stageId: string;
  order: number;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export interface Tag { id: string; name: string; preset: boolean; }

export type InterviewRound = "phone" | "technical" | "panel" | "final" | "other";

export interface Interview {
  id: string;
  applicationId: string;
  roundType: InterviewRound;
  scheduledAt: string;
  locationOrLink?: string;
  notes?: string;
}

export interface Contact {
  id: string;
  applicationId: string;
  name: string;
  role?: string;
  email?: string;
  linkedin?: string;
}

export type ActivityKind = "created" | "stage_move" | "edit" | "note" | "manual";

export interface ActivityEvent {
  id: string;
  applicationId: string;
  kind: ActivityKind;
  message: string;
  at: string;
}

export interface NoteDoc {
  id: string;
  applicationId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderType = "follow_up" | "interview" | "custom";

export interface Reminder {
  id: string;
  applicationId?: string;
  type: ReminderType;
  title: string;
  dueAt: string;
  done: boolean;
  snoozedUntil?: string;
}

export interface SettingsDoc {
  id: "singleton";
  nudgeDays: number;
  currency: string;
  theme: "light";
  demo: boolean;
}

export interface Snapshot {
  stages: Stage[];
  applications: Application[];
  tags: Tag[];
  interviews: Interview[];
  contacts: Contact[];
  events: ActivityEvent[];
  notes: NoteDoc[];
  reminders: Reminder[];
  settings: SettingsDoc;
  profile: Profile | null;
  cvdocs: CvDoc[];
}

export interface Filters {
  search: string;
  tagIds: string[];
  sources: string[];
  hasSalary: boolean | null;
}

export const EMPTY_FILTERS: Filters = { search: "", tagIds: [], sources: [], hasSalary: null };
