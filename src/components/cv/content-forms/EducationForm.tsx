"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { newId } from "@/lib/id";
import type { EducationEntry } from "@/cv/types";
import { Area, EntryShell, Field, replaceAt, removeAt, moveItem, type ContentFormProps } from "../form-kit";

export function EducationForm({ content, onChange }: ContentFormProps) {
  const entries = content.education;
  const patch = (i: number, p: Partial<EducationEntry>) =>
    onChange({ education: replaceAt(entries, i, { ...entries[i], ...p }) });

  return (
    <div className="flex flex-col gap-3">
      {entries.map((e, i) => (
        <EntryShell key={e.id} title={e.school || "New school"}
          onRemove={() => onChange({ education: removeAt(entries, i) })}
          onMoveUp={i > 0 ? () => onChange({ education: moveItem(entries, i, i - 1) }) : undefined}
          onMoveDown={i < entries.length - 1 ? () => onChange({ education: moveItem(entries, i, i + 1) }) : undefined}>
          <Field id={`edu-${e.id}-school`} label="School" value={e.school}
            onCommit={(v) => patch(i, { school: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field id={`edu-${e.id}-degree`} label="Degree" value={e.degree ?? ""}
              onCommit={(v) => patch(i, { degree: v })} placeholder="BSc" />
            <Field id={`edu-${e.id}-field`} label="Field of study" value={e.field ?? ""}
              onCommit={(v) => patch(i, { field: v })} placeholder="Computer Science" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`edu-${e.id}-start`} label="Start date" type="month" value={e.startDate ?? ""}
              onCommit={(v) => patch(i, { startDate: v })} />
            <Field id={`edu-${e.id}-end`} label="End date" type="month" value={e.endDate ?? ""}
              onCommit={(v) => patch(i, { endDate: v })} />
          </div>
          <Area id={`edu-${e.id}-notes`} label="Notes" rows={2} value={e.notes ?? ""}
            onCommit={(v) => patch(i, { notes: v })} placeholder="Honors, thesis, relevant coursework…" />
        </EntryShell>
      ))}
      <Button type="button" variant="secondary" size="sm" className="self-start"
        onClick={() => onChange({ education: [...entries, { id: newId(), school: "" }] })}>
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add education
      </Button>
    </div>
  );
}
