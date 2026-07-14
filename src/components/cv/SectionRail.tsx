"use client";

import {
  DndContext, KeyboardSensor, PointerSensor,
  closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import { SECTION_LABELS, type CvSection } from "@/cv/types";

function SortableRow({ section, onToggle }: { section: CvSection; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.key });
  const label = SECTION_LABELS[section.key];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 rounded-xl py-0.5 ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        aria-label={`Reorder ${label} (drag, or use arrow keys)`}
        className="cursor-grab touch-none rounded-full p-1.5 text-ink-3 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-ink active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={section.visible}
        aria-label={section.visible ? `Hide ${label}` : `Show ${label}`}
        onClick={onToggle}
        className="rounded-full p-1.5 text-ink-3 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-ink"
      >
        {section.visible
          ? <Eye className="h-4 w-4" aria-hidden />
          : <EyeOff className="h-4 w-4" aria-hidden />}
      </button>
      <span className={`flex-1 truncate text-sm ${section.visible ? "font-semibold text-ink" : "text-ink-3"}`}>
        {label}
      </span>
    </li>
  );
}

/** Ordered list of a CV's sections: toggle visibility and drag to reorder.
 *  Every mutation produces a fresh array handed back via `onChange`. */
export function SectionRail({ sections, onChange }: {
  sections: CvSection[];
  onChange: (sections: CvSection[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggle = (i: number) =>
    onChange(sections.map((s, j) => (j === i ? { ...s, visible: !s.visible } : s)));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.key === active.id);
    const to = sections.findIndex((s) => s.key === over.id);
    if (from === -1 || to === -1) return;
    const next = sections.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-0.5">
          {sections.map((s, i) => (
            <SortableRow key={s.key} section={s} onToggle={() => toggle(i)} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
