"use client";

import { Area, type ContentFormProps } from "../form-kit";

export function SummaryForm({ content, onChange }: ContentFormProps) {
  return (
    <Area id="cv-summary" label="Professional summary" rows={4}
      value={content.summary ?? ""}
      onCommit={(v) => onChange({ summary: v })}
      placeholder="Two or three sentences on who you are and what you bring…" />
  );
}
