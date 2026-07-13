"use client";

import { Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SECTION_LABELS, type CvSection } from "@/cv/types";

/** Ordered list of a CV's sections: toggle visibility and reorder.
 *  Every mutation produces a fresh array handed back via `onChange`. */
export function SectionRail({ sections, onChange }: {
  sections: CvSection[];
  onChange: (sections: CvSection[]) => void;
}) {
  const toggle = (i: number) =>
    onChange(sections.map((s, j) => (j === i ? { ...s, visible: !s.visible } : s)));

  const move = (from: number, to: number) => {
    const next = sections.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <ul className="flex flex-col gap-0.5">
      {sections.map((s, i) => {
        const label = SECTION_LABELS[s.key];
        return (
          <li key={s.key} className="flex items-center gap-1.5 rounded-xl py-0.5">
            <button
              type="button"
              aria-pressed={s.visible}
              aria-label={s.visible ? `Hide ${label}` : `Show ${label}`}
              onClick={() => toggle(i)}
              className="rounded-full p-1.5 text-ink-3 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-ink"
            >
              {s.visible
                ? <Eye className="h-4 w-4" aria-hidden />
                : <EyeOff className="h-4 w-4" aria-hidden />}
            </button>
            <span className={`flex-1 truncate text-sm ${s.visible ? "font-semibold text-ink" : "text-ink-3"}`}>
              {label}
            </span>
            <Button variant="ghost" size="sm" aria-label={`Move ${label} up`} disabled={i === 0}
              onClick={() => move(i, i - 1)}>
              <ArrowUp className="h-3.5 w-3.5" aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" aria-label={`Move ${label} down`} disabled={i === sections.length - 1}
              onClick={() => move(i, i + 1)}>
              <ArrowDown className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
