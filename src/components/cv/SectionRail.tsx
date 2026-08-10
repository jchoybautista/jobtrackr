"use client";

import { Eye, EyeOff } from "lucide-react";
import { SortableList } from "@/components/ui/SortableList";
import { SECTION_LABELS, type CvSection } from "@/cv/types";

/** Ordered list of a CV's sections: toggle visibility and drag to reorder.
 *  Every mutation produces a fresh array handed back via `onChange`. */
export function SectionRail({ sections, onChange }: {
  sections: CvSection[];
  onChange: (sections: CvSection[]) => void;
}) {
  const toggle = (key: CvSection["key"]) =>
    onChange(sections.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)));

  return (
    <SortableList
      items={sections}
      getId={(s) => s.key}
      getLabel={(s) => SECTION_LABELS[s.key]}
      onReorder={onChange}
      className="flex flex-col gap-0.5"
      itemClassName="flex items-center gap-1 rounded-xl py-0.5"
    >
      {(s, handle) => {
        const label = SECTION_LABELS[s.key];
        return (
          <>
            {handle}
            <button
              type="button"
              aria-pressed={s.visible}
              aria-label={s.visible ? `Hide ${label}` : `Show ${label}`}
              onClick={() => toggle(s.key)}
              className="rounded-full p-1.5 text-ink-3 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-ink"
            >
              {s.visible
                ? <Eye className="h-4 w-4" aria-hidden />
                : <EyeOff className="h-4 w-4" aria-hidden />}
            </button>
            <span className={`flex-1 truncate text-sm ${s.visible ? "font-semibold text-ink" : "text-ink-3"}`}>
              {label}
            </span>
          </>
        );
      }}
    </SortableList>
  );
}
