"use client";

import { type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { newId } from "@/lib/id";
import type {
  AwardEntry, CertEntry, LanguageEntry, ProjectEntry, ReferenceEntry, VolunteerEntry,
} from "@/cv/types";
import {
  Area, BulletsEditor, EntryShell, Field,
  replaceAt, removeAt, moveItem, type ContentFormProps,
} from "../form-kit";

/* Shared plumbing for the simple entry-list forms: add / remove / reorder /
   per-entry patch, all producing fresh arrays for the onChange patch. */
function EntryList<T extends { id: string }>({ entries, commit, title, addLabel, makeEntry, renderFields }: {
  entries: T[];
  commit: (next: T[]) => void;
  title: (entry: T) => string;
  addLabel: string;
  makeEntry: () => T;
  renderFields: (entry: T, patch: (p: Partial<T>) => void) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {entries.map((e, i) => (
        <EntryShell key={e.id} title={title(e)}
          onRemove={() => commit(removeAt(entries, i))}
          onMoveUp={i > 0 ? () => commit(moveItem(entries, i, i - 1)) : undefined}
          onMoveDown={i < entries.length - 1 ? () => commit(moveItem(entries, i, i + 1)) : undefined}>
          {renderFields(e, (p) => commit(replaceAt(entries, i, { ...e, ...p })))}
        </EntryShell>
      ))}
      <Button type="button" variant="secondary" size="sm" className="self-start"
        onClick={() => commit([...entries, makeEntry()])}>
        <Plus className="h-3.5 w-3.5" aria-hidden /> {addLabel}
      </Button>
    </div>
  );
}

export function ProjectsForm({ content, onChange }: ContentFormProps) {
  return (
    <EntryList entries={content.projects} commit={(projects) => onChange({ projects })}
      addLabel="Add project" title={(e) => e.name || "New project"}
      makeEntry={(): ProjectEntry => ({ id: newId(), name: "", bullets: [] })}
      renderFields={(e, patch) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`proj-${e.id}-name`} label="Name" value={e.name}
              onCommit={(v) => patch({ name: v })} />
            <Field id={`proj-${e.id}-url`} label="URL" type="url" value={e.url ?? ""}
              onCommit={(v) => patch({ url: v })} placeholder="https://…" />
          </div>
          <Area id={`proj-${e.id}-description`} label="Description" rows={2} value={e.description ?? ""}
            onCommit={(v) => patch({ description: v })} />
          <BulletsEditor bullets={e.bullets} onChange={(bullets) => patch({ bullets })} />
        </>
      )} />
  );
}

export function CertificationsForm({ content, onChange }: ContentFormProps) {
  return (
    <EntryList entries={content.certifications} commit={(certifications) => onChange({ certifications })}
      addLabel="Add certification" title={(e) => e.name || "New certification"}
      makeEntry={(): CertEntry => ({ id: newId(), name: "" })}
      renderFields={(e, patch) => (
        <>
          <Field id={`cert-${e.id}-name`} label="Name" value={e.name}
            onCommit={(v) => patch({ name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field id={`cert-${e.id}-issuer`} label="Issuer" value={e.issuer ?? ""}
              onCommit={(v) => patch({ issuer: v })} />
            <Field id={`cert-${e.id}-date`} label="Date" type="month" value={e.date ?? ""}
              onCommit={(v) => patch({ date: v })} />
          </div>
        </>
      )} />
  );
}

export function LanguagesForm({ content, onChange }: ContentFormProps) {
  return (
    <EntryList entries={content.languages} commit={(languages) => onChange({ languages })}
      addLabel="Add language" title={(e) => e.name || "New language"}
      makeEntry={(): LanguageEntry => ({ id: newId(), name: "" })}
      renderFields={(e, patch) => (
        <div className="grid grid-cols-2 gap-3">
          <Field id={`lang-${e.id}-name`} label="Language" value={e.name}
            onCommit={(v) => patch({ name: v })} />
          <Field id={`lang-${e.id}-level`} label="Level" value={e.level ?? ""}
            onCommit={(v) => patch({ level: v })} placeholder="Fluent" />
        </div>
      )} />
  );
}

export function AwardsForm({ content, onChange }: ContentFormProps) {
  return (
    <EntryList entries={content.awards} commit={(awards) => onChange({ awards })}
      addLabel="Add award" title={(e) => e.name || "New award"}
      makeEntry={(): AwardEntry => ({ id: newId(), name: "" })}
      renderFields={(e, patch) => (
        <>
          <Field id={`award-${e.id}-name`} label="Name" value={e.name}
            onCommit={(v) => patch({ name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field id={`award-${e.id}-issuer`} label="Issuer" value={e.issuer ?? ""}
              onCommit={(v) => patch({ issuer: v })} />
            <Field id={`award-${e.id}-date`} label="Date" type="month" value={e.date ?? ""}
              onCommit={(v) => patch({ date: v })} />
          </div>
        </>
      )} />
  );
}

export function VolunteerForm({ content, onChange }: ContentFormProps) {
  return (
    <EntryList entries={content.volunteer} commit={(volunteer) => onChange({ volunteer })}
      addLabel="Add volunteer role" title={(e) => e.role || "New volunteer role"}
      makeEntry={(): VolunteerEntry => ({ id: newId(), role: "", org: "" })}
      renderFields={(e, patch) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`vol-${e.id}-role`} label="Role" value={e.role}
              onCommit={(v) => patch({ role: v })} />
            <Field id={`vol-${e.id}-org`} label="Organization" value={e.org}
              onCommit={(v) => patch({ org: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`vol-${e.id}-start`} label="Start date" type="month" value={e.startDate ?? ""}
              onCommit={(v) => patch({ startDate: v })} />
            <Field id={`vol-${e.id}-end`} label="End date" type="month" value={e.endDate ?? ""}
              onCommit={(v) => patch({ endDate: v })} />
          </div>
          <Area id={`vol-${e.id}-description`} label="Description" rows={2} value={e.description ?? ""}
            onCommit={(v) => patch({ description: v })} />
        </>
      )} />
  );
}

export function InterestsForm({ content, onChange }: ContentFormProps) {
  return (
    <Area id="cv-interests" label="Interests" rows={3}
      value={content.interests ?? ""}
      onCommit={(v) => onChange({ interests: v })}
      placeholder="Photography, trail running, open-source…" />
  );
}

export function ReferencesForm({ content, onChange }: ContentFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={content.referencesOnRequest}
          onChange={(e) => onChange({ referencesOnRequest: e.target.checked })}
          className="h-4 w-4 rounded border-line" />
        References available on request
      </label>
      {!content.referencesOnRequest && (
        <EntryList entries={content.references} commit={(references) => onChange({ references })}
          addLabel="Add reference" title={(e) => e.name || "New reference"}
          makeEntry={(): ReferenceEntry => ({ id: newId(), name: "" })}
          renderFields={(e, patch) => (
            <>
              <Field id={`ref-${e.id}-name`} label="Name" value={e.name}
                onCommit={(v) => patch({ name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field id={`ref-${e.id}-role`} label="Role" value={e.role ?? ""}
                  onCommit={(v) => patch({ role: v })} />
                <Field id={`ref-${e.id}-company`} label="Company" value={e.company ?? ""}
                  onCommit={(v) => patch({ company: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field id={`ref-${e.id}-email`} label="Email" type="email" value={e.email ?? ""}
                  onCommit={(v) => patch({ email: v })} />
                <Field id={`ref-${e.id}-phone`} label="Phone" type="tel" value={e.phone ?? ""}
                  onCommit={(v) => patch({ phone: v })} />
              </div>
            </>
          )} />
      )}
    </div>
  );
}
