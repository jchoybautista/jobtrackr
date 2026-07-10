"use client";

import { create } from "zustand";
import type {
  Application, Contact, Filters, Interview, NoteDoc, PaletteKey,
  Reminder, SettingsDoc, Snapshot, Tag,
} from "./types";
import { EMPTY_FILTERS } from "./types";
import { newId } from "./id";
import { moveCard, reorderStages } from "./ordering";
import { PALETTE_KEYS } from "./palette";
import * as repo from "./repo";
import { fromJson, toJson } from "./exportio";
import { seedIfEmpty, clearDemoData, DEFAULT_STAGES, PRESET_TAGS } from "./seed";

const nowIso = () => new Date().toISOString();

interface AppState extends Snapshot {
  ready: boolean;
  persistBroken: boolean;
  filters: Filters;
  selectedAppId: string | null;

  hydrate(): Promise<void>;
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
  clearDemo(): Promise<void>;
  resetAllData(): Promise<void>;
  importData(json: string, mode: "replace" | "merge"): Promise<void>;
  exportJson(): string;
  setFilters(f: Filters): void;
  selectApp(id: string | null): void;
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
  ready: false, persistBroken: false,
  filters: EMPTY_FILTERS, selectedAppId: null,

  async hydrate() {
    try {
      await seedIfEmpty();
      const snap = await repo.loadAll();
      set(() => ({ ...snap, ready: true }));
    } catch {
      set(() => ({
        stages: DEFAULT_STAGES, tags: PRESET_TAGS,
        settings: repo.DEFAULT_SETTINGS, ready: true, persistBroken: true,
      }));
    }
  },

  async addApplication(input) {
    const s = get();
    const stageId = input.stageId ?? s.stages[0]?.id ?? "stage-saved";
    const order = s.applications.filter((a) => a.stageId === stageId).length;
    const app: Application = {
      tagIds: [], ...input, id: newId(), stageId, order,
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
      selectedAppId: s.selectedAppId === id ? null : s.selectedAppId,
    }));
    await repo.deleteApplication(id).catch(() => {});
  },

  async moveApplication(id, toStageId, toIndex) {
    const s = get();
    const stage = s.stages.find((st) => st.id === toStageId);
    const before = s.applications.find((a) => a.id === id);
    const moved = moveCard(s.applications, id, toStageId, toIndex, nowIso());
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
    const stage = { id: newId(), name, color, order: s.stages.length, kind: "pipeline" as const };
    set((st) => ({ stages: [...st.stages, stage] }));
    await repo.putStage(stage).catch(() => {});
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
    const next = reorderStages(get().stages, id, toIndex);
    set(() => ({ stages: next }));
    await repo.putStages(next).catch(() => {});
  },

  async removeStage(id) {
    if (get().applications.some((a) => a.stageId === id)) return false;
    set((s) => ({ stages: s.stages.filter((st) => st.id !== id) }));
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
    const loaded = await repo.loadAll();
    set(() => ({ ...loaded }));
  },

  exportJson() {
    const s = get();
    const { stages, applications, tags, interviews, contacts, events, notes, reminders, settings } = s;
    return toJson({ stages, applications, tags, interviews, contacts, events, notes, reminders, settings });
  },

  setFilters(f) { set(() => ({ filters: f })); },
  selectApp(id) { set(() => ({ selectedAppId: id })); },
}));
