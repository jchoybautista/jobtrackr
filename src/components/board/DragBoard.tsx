"use client";

import { useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor,
  closestCorners, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useApp } from "@/lib/store";
import { columnTints } from "@/lib/palette";
import { JobCard } from "./JobCard";
import { toast } from "@/components/ui/Toast";

async function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, scalar: 0.9 });
}

export function DragBoard({ children }: { children: React.ReactNode }) {
  const s = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const activeApp = s.applications.find((a) => a.id === active.id);
    if (!activeApp) return;

    let toStageId: string;
    let toIndex: number;
    const overApp = s.applications.find((a) => a.id === overId);
    if (overApp) {
      toStageId = overApp.stageId;
      const column = s.applications
        .filter((a) => a.stageId === toStageId && a.id !== activeApp.id)
        .sort((a, b) => a.order - b.order);
      toIndex = column.findIndex((a) => a.id === overId);
      if (toIndex === -1) toIndex = column.length;
    } else if (s.stages.some((st) => st.id === overId)) {
      toStageId = overId;
      toIndex = s.applications.filter((a) => a.stageId === overId).length;
    } else {
      return;
    }

    if (toStageId === activeApp.stageId && toIndex === activeApp.order) return;
    const { won } = await s.moveApplication(activeApp.id, toStageId, toIndex);
    if (won) {
      void celebrate();
      toast(`${activeApp.company} moved to offer — congrats! 🎉`, "success");
    }
  }

  const activeApp = activeId ? s.applications.find((a) => a.id === activeId) : null;
  const activeStage = activeApp ? s.stages.find((st) => st.id === activeApp.stageId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {children}
      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.15)" }}>
        {activeApp && activeStage && (
          <div className="rotate-3 scale-[1.04] shadow-2xl motion-reduce:rotate-0 motion-reduce:scale-100">
            <JobCard
              app={activeApp}
              tags={activeApp.tagIds
                .map((t) => s.tags.find((x) => x.id === t))
                .filter((t): t is NonNullable<typeof t> => !!t)}
              tints={columnTints(activeStage.color)}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
