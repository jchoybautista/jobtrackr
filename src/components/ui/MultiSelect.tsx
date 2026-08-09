"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  /** Field name shown in the trigger, e.g. "Outcome". */
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Summary shown when nothing is selected, e.g. "All outcomes". */
  allLabel?: string;
  className?: string;
}

/** A select-style field that accepts several values at once.
 *
 *  A native `<select multiple>` renders as a scrolling list box that needs
 *  Cmd-click to deselect, so this uses the pattern people expect from a filter
 *  instead: a trigger that reads like a select, opening a panel of checkboxes.
 *  Checkboxes are real `<input type="checkbox">` elements, so screen readers
 *  announce checked state and Space toggles without any custom key handling —
 *  arrow keys are added on top to match native select muscle memory. */
export function MultiSelect({
  label, options, selected, onChange, allLabel = "All", className = "",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Close on Escape or a click outside, returning focus to the trigger so
  // keyboard users are not dropped at the top of the document.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [open]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const move = (from: HTMLInputElement, delta: number) => {
    const inputs = Array.from(panelRef.current?.querySelectorAll<HTMLInputElement>("input") ?? []);
    const next = inputs[inputs.indexOf(from) + delta];
    next?.focus();
  };

  const chosen = options.filter((o) => selected.includes(o.value));
  const summary =
    chosen.length === 0 ? allLabel
      : chosen.length === 1 ? chosen[0].label
        : `${chosen[0].label} +${chosen.length - 1}`;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}: ${summary}`}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 w-full items-center gap-2 rounded-full border px-4 text-sm transition-colors sm:h-10 sm:w-auto ${
          chosen.length > 0
            ? "border-ink bg-ink text-white hover:opacity-85"
            : "border-line bg-surface text-ink hover:bg-sunken"
        }`}
      >
        <span className={chosen.length > 0 ? "text-white/70" : "text-ink-3"}>{label}</span>
        <span className="font-semibold">{summary}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label={`${label} options`}
          className="absolute left-0 top-12 z-30 min-w-full max-w-[calc(100vw-2.5rem)] rounded-2xl border border-line-2 bg-surface p-1.5 shadow-xl sm:w-56"
        >
          <ul className="max-h-72 overflow-y-auto">
            {options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <li key={o.value}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium hover:bg-sunken sm:min-h-9">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(o.value)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") { e.preventDefault(); move(e.currentTarget, 1); }
                        if (e.key === "ArrowUp") { e.preventDefault(); move(e.currentTarget, -1); }
                      }}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-line-2 bg-surface peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
                    >
                      {on && <Check className="h-3 w-3 text-white" aria-hidden />}
                    </span>
                    {o.label}
                  </label>
                </li>
              );
            })}
          </ul>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-xl border-t border-line px-2.5 py-2.5 text-left text-sm font-semibold text-ink-2 hover:bg-sunken"
            >
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
