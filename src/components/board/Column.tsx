"use client";

import type { Application, Interview, Stage, Tag } from "@/lib/types";
import { columnTints } from "@/lib/palette";
import { JobCard } from "./JobCard";

export interface ColumnProps {
  stage: Stage;
  apps: Application[];
  tagById: Map<string, Tag>;
  nudges: Map<string, number>;
  nextInterviewByApp: Map<string, Interview>;
  noteCountByApp: Map<string, number>;
  onCardClick: (id: string) => void;
}

export function Column({
  stage, apps, tagById, nudges, nextInterviewByApp, noteCountByApp, onCardClick,
}: ColumnProps) {
  const tints = columnTints(stage.color);
  return (
    <section aria-label={`${stage.name} column, ${apps.length} applications`}
      className="flex w-[248px] shrink-0 snap-start flex-col">
      <header className="mb-2.5 flex items-center gap-2 px-0.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: tints.dot }} aria-hidden />
        <h2 className="text-[13px] font-bold">{stage.name}</h2>
        <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-ink-3">
          {String(apps.length).padStart(2, "0")}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2.5">
        {apps.map((app) => (
          <JobCard
            key={app.id} app={app} tints={tints}
            tags={app.tagIds.map((t) => tagById.get(t)).filter((t): t is Tag => !!t)}
            nudgeDays={nudges.get(app.id)}
            interview={nextInterviewByApp.get(app.id)}
            noteCount={noteCountByApp.get(app.id) ?? 0}
            dimmed={stage.kind === "lost"}
            onClick={() => onCardClick(app.id)}
          />
        ))}
        {apps.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-3">
            Nothing here yet
          </p>
        )}
      </div>
    </section>
  );
}
