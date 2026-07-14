"use client";

import type { ReactNode } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor,
  closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

function Row({ id, label, children }: {
  id: string;
  label: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const handle = (
    <button
      type="button"
      aria-label={`Reorder ${label} (drag, or use arrow keys)`}
      className="cursor-grab touch-none rounded-full p-1.5 text-ink-3 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-ink active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
    >
      {children(handle)}
    </div>
  );
}

/** Vertical drag-to-reorder list. The single reorder idiom in the app — no
 *  up/down arrow buttons anywhere. Keyboard users get the same capability
 *  through the handle's dnd-kit KeyboardSensor bindings.
 *
 *  `onReorder` reports the reordered array AND which item moved where: a list
 *  owner (SectionRail) wants the array, while a store with a `move(id, index)`
 *  API (the settings pipeline) wants the one moved item, since a splice shifts
 *  every item in between and diffing indices would fire a cascade of moves. */
export function SortableList<T>({ items, getId, getLabel, onReorder, children }: {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onReorder: (items: T[], moved: { id: string; toIndex: number }) => void;
  children: (item: T, handle: ReactNode) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => getId(i) === active.id);
    const to = items.findIndex((i) => getId(i) === over.id);
    if (from === -1 || to === -1) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next, { id: getId(moved), toIndex: to });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <Row key={getId(item)} id={getId(item)} label={getLabel(item)}>
            {(handle) => children(item, handle)}
          </Row>
        ))}
      </SortableContext>
    </DndContext>
  );
}
