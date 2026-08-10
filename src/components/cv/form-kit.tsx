"use client";

import { useId, type ReactNode } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CvContent } from "@/cv/types";

export const inputClass = "w-full rounded-xl border border-line px-3 py-2 text-base placeholder:text-ink-3";
export const labelClass = "mb-1 block text-xs font-semibold text-ink-2";

/** The uniform contract every content form implements. */
export interface ContentFormProps {
  content: CvContent;
  onChange: (patch: Partial<CvContent>) => void;
}

/** Empty-section note for the entry-list forms. The "Add …" button below it is
 *  the action, so this only has to say the section is empty on purpose. */
export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-sm text-ink-3">
      {children}
    </p>
  );
}

/* ---------- immutable list helpers ---------- */

export function replaceAt<T>(arr: T[], index: number, item: T): T[] {
  const next = arr.slice();
  next[index] = item;
  return next;
}

export function removeAt<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index);
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* ---------- Field / Area (blur-commit, DetailPanel idiom) ---------- */

export function Field({ id, label, value, onCommit, type = "text", placeholder }: {
  id: string;
  label: string;
  value: string;
  onCommit: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => e.target.value !== value && onCommit(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

export function Area({ id, label, value, onCommit, rows = 3, placeholder }: {
  id: string;
  label: string;
  value: string;
  onCommit: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <textarea
        id={id}
        rows={rows}
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => e.target.value !== value && onCommit(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

/* ---------- EntryShell ---------- */

const iconBtn = "rounded-full p-1.5 text-ink-3 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none";

export function EntryShell({ title, onRemove, onMoveUp, onMoveDown, children }: {
  title: string;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children: ReactNode;
}) {
  const name = title || "entry";
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-base font-bold">{title || "Untitled"}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          {onMoveUp && (
            <button type="button" aria-label={`Move ${name} up`} onClick={onMoveUp} className={iconBtn}>
              <ChevronUp className="h-4 w-4" aria-hidden />
            </button>
          )}
          {onMoveDown && (
            <button type="button" aria-label={`Move ${name} down`} onClick={onMoveDown} className={iconBtn}>
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          )}
          <button type="button" aria-label={`Remove ${name}`} onClick={onRemove}
            className="rounded-full p-1.5 text-ink-3 hover:bg-danger-bg hover:text-danger">
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

/* ---------- BulletsEditor ---------- */

export function BulletsEditor({ bullets, onChange }: {
  bullets: string[];
  onChange: (bullets: string[]) => void;
}) {
  const uid = useId();
  return (
    <div>
      <p className={labelClass}>Bullet points</p>
      <ul className="flex flex-col gap-2">
        {bullets.map((bullet, i) => (
          // Length in the key remounts remaining textareas after a removal,
          // so uncontrolled defaultValues never go stale.
          <li key={`${bullets.length}-${i}`} className="flex items-start gap-2">
            <div className="flex-1">
              <label htmlFor={`${uid}-bullet-${i}`} className="sr-only">{`Bullet ${i + 1}`}</label>
              <textarea
                id={`${uid}-bullet-${i}`}
                rows={2}
                defaultValue={bullet}
                onBlur={(e) => e.target.value !== bullet && onChange(replaceAt(bullets, i, e.target.value))}
                className={inputClass}
              />
            </div>
            <button type="button" aria-label={`Remove bullet ${i + 1}`}
              onClick={() => onChange(removeAt(bullets, i))}
              className="mt-1 rounded-full p-1.5 text-ink-3 hover:bg-sunken">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="ghost" size="sm" className={bullets.length ? "mt-2" : ""}
        onClick={() => onChange([...bullets, ""])}>
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add bullet
      </Button>
    </div>
  );
}
