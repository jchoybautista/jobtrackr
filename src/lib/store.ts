"use client";

import { create } from "zustand";
import type {
  Application, Contact, Filters, Interview, NoteDoc, PaletteKey,
  Reminder, SettingsDoc, Snapshot, Stage, Tag, Profile, CvDoc,
} from "./types";
import { EMPTY_FILTERS } from "./types";
import type { CvContent, CvSection, TemplateId } from "@/cv/types";
import { emptyCvContent, DEFAULT_SECTIONS } from "@/cv/types";
import { newId } from "./id";
import { moveCard, reorderStages, reorderStagesPinned, reassignStageCards } from "./ordering";
import { PALETTE_KEYS } from "./palette";
import * as repo from "./repo";
import { fromJson, toJson } from "./exportio";
import { seedIfEmpty, clearDemoData, DEFAULT_STAGES, PRESET_TAGS } from "./seed";
import { needsMigration, migrateSnapshot } from "./migrate";
import { applyFurthestOnMove } from "./furthest";
import { setScope, closeDb, type DbScope } from "./db";
import { adoptLegacyDatabase } from "./legacy";

const nowIso = () => new Date().toISOString();

/** Guards against a slow hydrate landing after the user switched accounts. */
let hydrateSeq = 0;

interface AppState extends Snapshot {
  ready: boolean;
  persistBroken: boolean;
  filters: Filters;
  selectedAppId: string | null;

  hydrate(scope: DbScope): Promise<void>;
  resetLocal(): void;
  addApplication(input: Partial<Application> & { company: string; role: string }): Promise<Application>;
  updateApplication(id: string, patch: Partial<Application>): Promise<void>;
  removeApplication(id: string): Promise<void>;
  moveApplication(id: string, toStageId: string, toIndex: number): Promise<{ won: boolean }>;
  addStage(name: string): Promise<void>;
  renameStage(id: string, name: string): Promise<void>;
  recolorStage(id: string, color: PaletteKey): Promise<void>;
  moveStage(id: string, toIndex: number): Promise<void>;
  removeStage(id: string): Promise<boolean>;
  addTag(name: string): Promise<Tag>;
  renameTag(id: string, name: string): Promise<void>;
  removeTag(id: string): Promise<void>;
  addInterview(x: Omit<Interview, "id">): Promise<void>;
  removeInterview(id: string): Promise<void>;
  addContact(x: Omit<Contact, "id">): Promise<void>;
  removeContact(id: string): Promise<void>;
  addNote(applicationId: string, body: string): Promise<void>;
  updateNote(id: string, body: string): Promise<void>;
  removeNote(id: string): Promise<void>;
  addManualActivity(applicationId: string, message: string): Promise<void>;
  addReminder(x: Omit<Reminder, "id" | "done">): Promise<void>;
  completeReminder(id: string): Promise<void>;
  snoozeReminder(id: string, untilIso: string): Promise<void>;
  updateSettings(patch: Partial<SettingsDoc>): Promise<void>;
  saveProfile(content: CvContent): Promise<void>;
  setProfilePhoto(photo: Blob | undefined): Promise<void>;
  createCv(name: string, templateId: TemplateId): Promise<CvDoc>;
  duplicateCv(id: string): Promise<CvDoc | null>;
  updateCv(id: string, patch: Partial<Pick<CvDoc, "name" | "templateId" | "accent" | "showPhoto" | "applicationId">>): Promise<void>;
  updateCvContent(id: string, patch: Partial<CvContent>): Promise<void>;
  setCvSections(id: string, sections: CvSection[]): Promise<void>;
  removeCv(id: string): Promise<void>;
  clearDemo(): Promise<void>;
  resetAllData(): Promise<void>;
  importData(json: string, mode: "replace" | "merge"): Promise<void>;
  exportJson(): Promise<string>;
  setFilters(f: Filters): void;
  selectApp(id: string | null): void;
}

/** A new account needs a usable board — default stages and preset tags — but
 *  none of the demo's sample applications. */
async function ensureBaseline(): Promise<void> {
  if ((await repo.loadAll()).stages.length > 0) return;
  await repo.putStages(DEFAULT_STAGES);
  for (const t of PRESET_TAGS) await repo.putTag(t);
  await repo.putSettings({ ...repo.DEFAULT_SETTINGS });
}

async function logEvent(
  set: (fn: (s: AppState) => Partial<AppState>) => void,
  applicationId: string, kind: "created" | "stage_move" | "edit" | "note" | "manual", message: string,
) {
  const ev = { id: newId(), applicationId, kind, message, at: nowIso() };
  set((s) => ({ events: [ev, ...s.events] }));
  await repo.putEvent(ev).catch(() => {});
}

export const useApp = create<AppState>()((set, get) => ({
  stages: [], applications: [], tags: [], interviews: [], contacts: [],
  events: [], notes: [], reminders: [],
  settings: repo.DEFAULT_SETTINGS,
  profile: null, cvdocs: [],
  ready: false, persistBroken: false,
  filters: EMPTY_FILTERS, selectedAppId: null,

  async hydrate(scope) {
    // Switching accounts mid-load must not let the previous account's snapshot
    // land in the new account's UI: loadAll() binds its database before eleven
    // awaits, so a slow read can outlive the scope that started it.
    const seq = ++hydrateSeq;
    try {
      setScope(scope);
      // First sign-in on a device that predates accounts: claim the old data
      // before anything reads an empty board and seeds over the top of it.
      // Its own try/catch: a failed migration is not broken storage. The legacy
      // database is untouched and the next sign-in retries, so the right
      // behaviour is to carry on with an empty board rather than fall into the
      // outer catch and tell the user their storage is unavailable.
      if (scope.kind === "user") {
        try {
          await adoptLegacyDatabase(scope.userId);
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Could not adopt the pre-auth database; will retry next sign-in", err);
          }
        }
      }

      // Only the demo sandbox gets sample data — a real account starts empty.
      if (scope.kind === "demo") await seedIfEmpty();
      else await ensureBaseline();

      let snap = await repo.loadAll();
      if (needsMigration(snap)) {
        snap = migrateSnapshot(snap);
        await repo.importSnapshot(snap, "replace");
        snap = await repo.loadAll();
      }
      if (seq !== hydrateSeq) return;  // a newer hydrate superseded this one
      set(() => ({ ...snap, ready: true, persistBroken: false }));
    } catch {
      if (seq !== hydrateSeq) return;
      set(() => ({
        stages: DEFAULT_STAGES, tags: PRESET_TAGS,
        settings: repo.DEFAULT_SETTINGS, profile: null, cvdocs: [],
        ready: true, persistBroken: true,
      }));
    }
  },

  resetLocal() {
    closeDb();
    set(() => ({
      stages: [], applications: [], tags: [], interviews: [], contacts: [],
      events: [], notes: [], reminders: [], settings: repo.DEFAULT_SETTINGS,
      profile: null, cvdocs: [], ready: false, selectedAppId: null,
      filters: EMPTY_FILTERS, persistBroken: false,
    }));
  },

  async addApplication(input) {
    const s = get();
    const stageId = input.stageId ?? s.stages[0]?.id ?? "stage-saved";
    const order = s.applications.filter((a) => a.stageId === stageId).length;
    const stage = s.stages.find((st) => st.id === stageId);
    const furthestStageId = stage?.kind === "pipeline" ? stageId : undefined;
    const app: Application = {
      tagIds: [], furthestStageId, ...input, id: newId(), stageId, order,
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    set((st) => ({ applications: [...st.applications, app] }));
    await repo.putApplication(app).catch(() => {});
    await logEvent(set, app.id, "created", "Application created");
    return app;
  },

  async updateApplication(id, patch) {
    let next: Application | undefined;
    set((s) => ({
      applications: s.applications.map((a) => {
        if (a.id !== id) return a;
        next = { ...a, ...patch, id, updatedAt: nowIso() };
        return next;
      }),
    }));
    if (next) {
      await repo.putApplication(next).catch(() => {});
      await logEvent(set, id, "edit", "Details updated");
    }
  },

  async removeApplication(id) {
    set((s) => ({
      applications: s.applications.filter((a) => a.id !== id),
      interviews: s.interviews.filter((i) => i.applicationId !== id),
      contacts: s.contacts.filter((c) => c.applicationId !== id),
      events: s.events.filter((e) => e.applicationId !== id),
      notes: s.notes.filter((n) => n.applicationId !== id),
      reminders: s.reminders.filter((r) => r.applicationId !== id),
      cvdocs: s.cvdocs.map((c) => (c.applicationId === id ? { ...c, applicationId: undefined } : c)),
      selectedAppId: s.selectedAppId === id ? null : s.selectedAppId,
    }));
    await repo.deleteApplication(id).catch(() => {});
  },

  async moveApplication(id, toStageId, toIndex) {
    const s = get();
    const stage = s.stages.find((st) => st.id === toStageId);
    const before = s.applications.find((a) => a.id === id);
    let moved = moveCard(s.applications, id, toStageId, toIndex, nowIso());
    moved = moved.map((a) => (a.id === id ? applyFurthestOnMove(a, toStageId, s.stages) : a));
    set(() => ({ applications: moved }));
    const changed = moved.filter((a, i) => a !== s.applications[i]);
    await repo.putApplications(changed).catch(() => {});
    if (stage && before && before.stageId !== toStageId) {
      await logEvent(set, id, "stage_move", `Moved to ${stage.name}`);
    }
    return { won: stage?.kind === "won" && before?.stageId !== toStageId };
  },

  async addStage(name) {
    const s = get();
    const color = PALETTE_KEYS[s.stages.length % PALETTE_KEYS.length];
    const stage: Stage = { id: newId(), name, color, order: s.stages.length, kind: "pipeline" };
    const sorted = [...s.stages, stage].sort((a, b) => a.order - b.order);
    const lastPinned = sorted[sorted.length - 2]?.pinned ? sorted.length - 1 : sorted.length;
    const next = reorderStages(sorted, stage.id, lastPinned - 1);
    set(() => ({ stages: next }));
    await repo.putStages(next).catch(() => {});
  },

  async renameStage(id, name) {
    set((s) => ({ stages: s.stages.map((st) => (st.id === id ? { ...st, name } : st)) }));
    const st = get().stages.find((x) => x.id === id);
    if (st) await repo.putStage(st).catch(() => {});
  },

  async recolorStage(id, color) {
    set((s) => ({ stages: s.stages.map((st) => (st.id === id ? { ...st, color } : st)) }));
    const st = get().stages.find((x) => x.id === id);
    if (st) await repo.putStage(st).catch(() => {});
  },

  async moveStage(id, toIndex) {
    const next = reorderStagesPinned(get().stages, id, toIndex);
    set(() => ({ stages: next }));
    await repo.putStages(next).catch(() => {});
  },

  async removeStage(id) {
    const s = get();
    const stage = s.stages.find((st) => st.id === id);
    if (!stage || stage.pinned) return false;
    const sorted = [...s.stages].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((st) => st.id === id);
    const target = sorted[idx - 1] ?? sorted[idx + 1]; // previous, else next
    let apps = s.applications;
    if (target) apps = reassignStageCards(apps, id, target.id);
    const stages = sorted.filter((st) => st.id !== id).map((st, i) => ({ ...st, order: i }));
    set(() => ({ stages, applications: apps }));
    await repo.putStages(stages).catch(() => {});
    const moved = apps.filter((a, i) => a !== s.applications[i]);
    if (moved.length) await repo.putApplications(moved).catch(() => {});
    await repo.deleteStage(id).catch(() => {});
    return true;
  },

  async addTag(name) {
    const tag: Tag = { id: newId(), name, preset: false };
    set((s) => ({ tags: [...s.tags, tag] }));
    await repo.putTag(tag).catch(() => {});
    return tag;
  },

  async renameTag(id, name) {
    set((s) => ({ tags: s.tags.map((t) => (t.id === id ? { ...t, name } : t)) }));
    const t = get().tags.find((x) => x.id === id);
    if (t) await repo.putTag(t).catch(() => {});
  },

  async removeTag(id) {
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      applications: s.applications.map((a) =>
        a.tagIds.includes(id) ? { ...a, tagIds: a.tagIds.filter((t) => t !== id) } : a),
    }));
    await repo.deleteTag(id).catch(() => {});
    const touched = get().applications.filter((a) => !a.tagIds.includes(id));
    await repo.putApplications(touched).catch(() => {});
  },

  async addInterview(x) {
    const interview: Interview = { ...x, id: newId() };
    const app = get().applications.find((a) => a.id === x.applicationId);
    const reminder: Reminder = {
      id: newId(), applicationId: x.applicationId, type: "interview",
      title: `Interview: ${app?.company ?? "upcoming"}`,
      dueAt: new Date(Date.parse(x.scheduledAt) - 86_400_000).toISOString(), done: false,
    };
    set((s) => ({ interviews: [...s.interviews, interview], reminders: [...s.reminders, reminder] }));
    await repo.putInterview(interview).catch(() => {});
    await repo.putReminder(reminder).catch(() => {});
  },

  async removeInterview(id) {
    set((s) => ({ interviews: s.interviews.filter((i) => i.id !== id) }));
    await repo.deleteInterview(id).catch(() => {});
  },

  async addContact(x) {
    const contact: Contact = { ...x, id: newId() };
    set((s) => ({ contacts: [...s.contacts, contact] }));
    await repo.putContact(contact).catch(() => {});
  },

  async removeContact(id) {
    set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
    await repo.deleteContact(id).catch(() => {});
  },

  async addNote(applicationId, body) {
    const note: NoteDoc = { id: newId(), applicationId, body, createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ notes: [note, ...s.notes] }));
    await repo.putNote(note).catch(() => {});
    await logEvent(set, applicationId, "note", "Note added");
  },

  async updateNote(id, body) {
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, body, updatedAt: nowIso() } : n)) }));
    const n = get().notes.find((x) => x.id === id);
    if (n) await repo.putNote(n).catch(() => {});
  },

  async removeNote(id) {
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    await repo.deleteNote(id).catch(() => {});
  },

  async addManualActivity(applicationId, message) {
    await logEvent(set, applicationId, "manual", message);
  },

  async addReminder(x) {
    const r: Reminder = { ...x, id: newId(), done: false };
    set((s) => ({ reminders: [...s.reminders, r] }));
    await repo.putReminder(r).catch(() => {});
  },

  async completeReminder(id) {
    set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, done: true } : r)) }));
    const r = get().reminders.find((x) => x.id === id);
    if (r) await repo.putReminder(r).catch(() => {});
  },

  async snoozeReminder(id, untilIso) {
    set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, snoozedUntil: untilIso } : r)) }));
    const r = get().reminders.find((x) => x.id === id);
    if (r) await repo.putReminder(r).catch(() => {});
  },

  async updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set(() => ({ settings }));
    await repo.putSettings(settings).catch(() => {});
  },

  async saveProfile(content) {
    const profile: Profile = { id: "singleton", content, photo: get().profile?.photo, updatedAt: nowIso() };
    set(() => ({ profile }));
    await repo.putProfile(profile).catch(() => {});
  },

  async setProfilePhoto(photo) {
    const cur = get().profile;
    const profile: Profile = {
      id: "singleton", content: cur?.content ?? emptyCvContent(), photo, updatedAt: nowIso(),
    };
    set(() => ({ profile }));
    await repo.putProfile(profile).catch(() => {});
  },

  async createCv(name, templateId) {
    const src = get().profile?.content ?? emptyCvContent();
    const cv: CvDoc = {
      id: newId(), name, templateId, accent: "sky", showPhoto: templateId !== "classic",
      content: structuredClone(src), sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    set((s) => ({ cvdocs: [cv, ...s.cvdocs] }));
    await repo.putCvDoc(cv).catch(() => {});
    return cv;
  },

  async duplicateCv(id) {
    const src = get().cvdocs.find((c) => c.id === id);
    if (!src) return null;
    const cv: CvDoc = {
      ...structuredClone(src), id: newId(), name: `${src.name} (copy)`,
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    // Copy the thumbnail BEFORE the doc enters state: the new card reads its
    // thumbnail once on mount, so publishing the doc first makes the copy mount
    // against a missing row and sit on the wireframe fallback until a reload.
    const srcThumb = await repo.getCvThumb(id).catch(() => undefined);
    if (srcThumb) {
      // Restamp to the copy's own revision. The content is a clone, so the image
      // is already correct for it; leaving the source's older stamp would make the
      // copy look stale and trigger a pointless re-render on first open.
      await repo.putCvThumb({ ...srcThumb, id: cv.id, updatedAt: cv.updatedAt }).catch(() => {});
    }
    set((s) => ({ cvdocs: [cv, ...s.cvdocs] }));
    await repo.putCvDoc(cv).catch(() => {});
    return cv;
  },

  async updateCv(id, patch) {
    let next: CvDoc | undefined;
    set((s) => ({
      cvdocs: s.cvdocs.map((c) => (c.id === id ? (next = { ...c, ...patch, id, updatedAt: nowIso() }) : c)),
    }));
    if (next) await repo.putCvDoc(next).catch(() => {});
  },

  async updateCvContent(id, patch) {
    let next: CvDoc | undefined;
    set((s) => ({
      cvdocs: s.cvdocs.map((c) =>
        (c.id === id ? (next = { ...c, content: { ...c.content, ...patch }, updatedAt: nowIso() }) : c)),
    }));
    if (next) await repo.putCvDoc(next).catch(() => {});
  },

  async setCvSections(id, sections) {
    let next: CvDoc | undefined;
    set((s) => ({
      cvdocs: s.cvdocs.map((c) => (c.id === id ? (next = { ...c, sections, updatedAt: nowIso() }) : c)),
    }));
    if (next) await repo.putCvDoc(next).catch(() => {});
  },

  async removeCv(id) {
    set((s) => ({ cvdocs: s.cvdocs.filter((c) => c.id !== id) }));
    await repo.deleteCvDoc(id).catch(() => {});
    await repo.deleteCvThumb(id).catch(() => {});
  },

  async clearDemo() {
    await clearDemoData();
    const snap = await repo.loadAll();
    set(() => ({ ...snap }));
  },

  async resetAllData() {
    await repo.clearAll();
    await repo.putStages(DEFAULT_STAGES);
    for (const t of PRESET_TAGS) await repo.putTag(t);
    await repo.putSettings({ ...repo.DEFAULT_SETTINGS });
    const snap = await repo.loadAll();
    set(() => ({ ...snap, selectedAppId: null }));
  },

  async importData(json, mode) {
    const snap = fromJson(json); // throws on invalid — caller shows toast
    await repo.importSnapshot(snap, mode);
    let loaded = await repo.loadAll();
    if (needsMigration(loaded)) {
      loaded = migrateSnapshot(loaded);
      await repo.importSnapshot(loaded, "replace");
      loaded = await repo.loadAll();
    }
    set(() => ({ ...loaded }));
  },

  exportJson() {
    const s = get();
    const { stages, applications, tags, interviews, contacts, events, notes, reminders, settings, profile, cvdocs } = s;
    return toJson({ stages, applications, tags, interviews, contacts, events, notes, reminders, settings, profile, cvdocs });
  },

  setFilters(f) { set(() => ({ filters: f })); },
  selectApp(id) { set(() => ({ selectedAppId: id })); },
}));
