"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { newId } from "@/lib/id";
import type { SkillGroup } from "@/cv/types";
import { EntryShell, Field, replaceAt, removeAt, moveItem, type ContentFormProps } from "../form-kit";

export function parseSkills(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function SkillsForm({ content, onChange }: ContentFormProps) {
  const groups = content.skills;
  const patch = (i: number, p: Partial<SkillGroup>) =>
    onChange({ skills: replaceAt(groups, i, { ...groups[i], ...p }) });

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g, i) => (
        <EntryShell key={g.id} title={g.name || "New group"}
          onRemove={() => onChange({ skills: removeAt(groups, i) })}
          onMoveUp={i > 0 ? () => onChange({ skills: moveItem(groups, i, i - 1) }) : undefined}
          onMoveDown={i < groups.length - 1 ? () => onChange({ skills: moveItem(groups, i, i + 1) }) : undefined}>
          <Field id={`skills-${g.id}-name`} label="Group name" value={g.name}
            onCommit={(v) => patch(i, { name: v })} placeholder="Tools" />
          <Field id={`skills-${g.id}-list`} label="Skills (comma-separated)"
            value={g.skills.join(", ")}
            onCommit={(v) => patch(i, { skills: parseSkills(v) })}
            placeholder="Figma, Prototyping, User research" />
        </EntryShell>
      ))}
      <Button type="button" variant="secondary" size="sm" className="self-start"
        onClick={() => onChange({ skills: [...groups, { id: newId(), name: "", skills: [] }] })}>
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add skill group
      </Button>
    </div>
  );
}
