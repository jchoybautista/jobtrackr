"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Application, Interview, PaletteKey, Stage, Tag } from "@/lib/types";
import { columnTints, mixWithWhite, PALETTE } from "@/lib/palette";
import { useApp } from "@/lib/store";
import { JobCard, type JobCardProps } from "./JobCard";
import { ColorPicker } from "./ColorPicker";
import { ColumnMenu } from "./ColumnMenu";

export interface ColumnProps {
  stage: Stage;
  apps: Application[];
  tagById: Map<string, Tag>;
  nudges: Map<string, number>;
  nextInterviewByApp: Map<string, Interview>;
  noteCountByApp: Map<string, number>;
  docCountByApp: Map<string, number>;
  onCardClick: (id: string) => void;
  onQuickAdd: (stageId: string) => void;
}

function SortableCard(props: JobCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.app.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-30" : undefined}
      {...attributes}
      {...listeners}
    >
      <JobCard {...props} />
    </div>
  );
}

export function Column({
  stage, apps, tagById, nudges, nextInterviewByApp, noteCountByApp, docCountByApp, onCardClick, onQuickAdd,
}: ColumnProps) {
  const tints = columnTints(stage.color);
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const [pickerOpen, setPickerOpen] = useState(false);
  const dotRef = useRef<HTMLButtonElement>(null);
  const recolorStage = useApp((s) => s.recolorStage);
  const sortable = useSortable({ id: `col:${stage.id}`, disabled: !!stage.pinned });

  return (
    <section
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      aria-label={`${stage.name} column, ${apps.length} applications`}
      className="group/col flex w-[248px] shrink-0 snap-start flex-col">
      <header className="relative mb-2.5 flex items-center gap-2 px-0.5">
        <button
          ref={dotRef}
          type="button"
          aria-label={`Change ${stage.name} column color`}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
          className="h-2.5 w-2.5 rounded-full transition-transform hover:scale-125"
          style={{ background: tints.dot }}
        />
        {pickerOpen && (
          <ColorPicker
            value={stage.color}
            onChange={(c: PaletteKey) => void recolorStage(stage.id, c)}
            onClose={() => setPickerOpen(false)}
            excludeRef={dotRef}
          />
        )}
        <h2
          className="text-[13px] font-bold"
          {...(stage.pinned ? {} : sortable.attributes)}
          {...(stage.pinned ? {} : sortable.listeners)}
        >
          {stage.name}
        </h2>
        <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-ink-3">
          {String(apps.length).padStart(2, "0")}
        </span>
        <ColumnMenu stage={stage} />
      </header>
      <SortableContext items={apps.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex min-h-24 flex-1 flex-col gap-2.5 rounded-2xl p-1 transition-all duration-200"
          style={isOver ? {
            background: mixWithWhite(PALETTE[stage.color].hex, 0.4),
            boxShadow: `0 0 0 2px ${mixWithWhite(PALETTE[stage.color].hex, 0.65)}`,
          } : undefined}
        >
          {apps.map((app) => (
            <SortableCard
              key={app.id} app={app} tints={tints}
              tags={app.tagIds.map((t) => tagById.get(t)).filter((t): t is Tag => !!t)}
              nudgeDays={nudges.get(app.id)}
              interview={nextInterviewByApp.get(app.id)}
              noteCount={noteCountByApp.get(app.id) ?? 0}
              docCount={docCountByApp.get(app.id) ?? 0}
              dimmed={stage.kind === "lost"}
              onClick={() => onCardClick(app.id)}
            />
          ))}
          {apps.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-3">
              Drop a card here
            </p>
          )}
          <button
            type="button"
            onClick={() => onQuickAdd(stage.id)}
            className="mt-0.5 flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-ink-3 opacity-0 transition-opacity hover:bg-sunken focus-visible:opacity-100 group-hover/col:opacity-100"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </button>
        </div>
      </SortableContext>
    </section>
  );
}
