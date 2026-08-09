"use client";

import type { Application, Interview, Tag } from "@/lib/types";
import { formatSalary, relativeDays, shortDate } from "@/lib/format";
import { TagPill } from "@/components/ui/TagPill";
import { AlarmClock, CalendarClock, FileText, StickyNote } from "lucide-react";

export interface JobCardProps {
  app: Application;
  tags: Tag[];
  tints: { cardBg: string; cardBorder: string; textStrong: string; textMuted: string; pillBg: string; pillBorder: string };
  nudgeDays?: number;
  interview?: Interview;
  noteCount?: number;
  docCount?: number;
  dimmed?: boolean;
  onClick?: () => void;
}

export function JobCard({
  app, tags, tints, nudgeDays, interview, noteCount = 0, docCount = 0, dimmed, onClick,
}: JobCardProps) {
  const salary = formatSalary(app);
  const meta = [app.company, app.location, salary].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${app.role} at ${app.company} — open details`}
      className={`group w-full rounded-2xl border p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${dimmed ? "opacity-60" : ""}`}
      style={{ background: tints.cardBg, borderColor: tints.cardBorder }}
    >
      {tags.length > 0 && (
        <span className="mb-2 flex flex-wrap gap-1">
          {tags.map((t) => <TagPill key={t.id} name={t.name} />)}
        </span>
      )}
      <span className="block text-base font-bold leading-snug" style={{ color: tints.textStrong }}>{app.role}</span>
      <span className="mt-0.5 block text-sm" style={{ color: tints.textMuted }}>{meta}</span>

      {nudgeDays != null && (
        <span
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed px-2 py-1 text-xs font-medium"
          style={{ background: tints.pillBg, borderColor: tints.pillBorder, color: tints.textStrong }}
        >
          <AlarmClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {nudgeDays} days silent — follow up?
        </span>
      )}
      {interview && (
        <span
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed px-2 py-1 text-xs font-medium"
          style={{ background: tints.pillBg, borderColor: tints.pillBorder, color: tints.textStrong }}
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {interview.roundType} round · {shortDate(interview.scheduledAt)}
        </span>
      )}

      <span className="mt-2.5 flex items-center justify-between text-xs" style={{ color: tints.textMuted }}>
        <span>{app.appliedAt ? `Applied ${relativeDays(app.appliedAt, new Date().toISOString())}` : `Saved ${relativeDays(app.createdAt, new Date().toISOString())}`}</span>
        <span className="flex items-center gap-2.5">
          {docCount > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" aria-hidden />
              {docCount}
            </span>
          )}
          {noteCount > 0 && (
            <span className="flex items-center gap-1">
              <StickyNote className="h-3 w-3" aria-hidden />
              {noteCount}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
