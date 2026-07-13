"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { newId } from "@/lib/id";
import type { ExperienceEntry } from "@/cv/types";
import { BulletsEditor, EntryShell, Field, replaceAt, removeAt, moveItem, type ContentFormProps } from "../form-kit";

export function ExperienceForm({ content, onChange }: ContentFormProps) {
  const entries = content.experience;
  const patch = (i: number, p: Partial<ExperienceEntry>) =>
    onChange({ experience: replaceAt(entries, i, { ...entries[i], ...p }) });

  return (
    <div className="flex flex-col gap-3">
      {entries.map((e, i) => (
        <EntryShell key={e.id} title={e.role || "New role"}
          onRemove={() => onChange({ experience: removeAt(entries, i) })}
          onMoveUp={i > 0 ? () => onChange({ experience: moveItem(entries, i, i - 1) }) : undefined}
          onMoveDown={i < entries.length - 1 ? () => onChange({ experience: moveItem(entries, i, i + 1) }) : undefined}>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`exp-${e.id}-role`} label="Role" value={e.role}
              onCommit={(v) => patch(i, { role: v })} placeholder="Product Designer" />
            <Field id={`exp-${e.id}-company`} label="Company" value={e.company}
              onCommit={(v) => patch(i, { company: v })} />
          </div>
          <Field id={`exp-${e.id}-location`} label="Location" value={e.location ?? ""}
            onCommit={(v) => patch(i, { location: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field id={`exp-${e.id}-start`} label="Start date" type="month" value={e.startDate ?? ""}
              onCommit={(v) => patch(i, { startDate: v })} />
            <Field id={`exp-${e.id}-end`} label="End date" type="month" value={e.endDate ?? ""}
              onCommit={(v) => patch(i, { endDate: v })} />
          </div>
          <BulletsEditor bullets={e.bullets} onChange={(bullets) => patch(i, { bullets })} />
        </EntryShell>
      ))}
      <Button type="button" variant="secondary" size="sm" className="self-start"
        onClick={() => onChange({ experience: [...entries, { id: newId(), role: "", company: "", bullets: [] }] })}>
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add experience
      </Button>
    </div>
  );
}
